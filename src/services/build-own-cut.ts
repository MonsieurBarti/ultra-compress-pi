import type { TranscriptMessage } from "../types/session-compact.js";

export interface BuildOwnCutResult {
	messagesToSummarize: TranscriptMessage[];
	orphans: TranscriptMessage[];
}

export interface BuildOwnCutOptions {
	/** If provided, use this as the first message to keep; overrides heuristic */
	firstKeptEntryId?: string;
	/** Minimum number of complete turns to keep as orphans */
	minOrphanTurns?: number;
}

/**
 * A "turn" in PI session terms is:
 *   user message → assistant message(s) → [tool calls] → [tool results]
 *
 * A turn is "complete" when:
 *   - Every tool_call has a matching tool_result
 *   - The assistant's message chain is closed
 */
interface Turn {
	startIndex: number;
	endIndex: number;
	messages: TranscriptMessage[];
	isComplete: boolean;
}

function extractId(msg: TranscriptMessage, index: number): string {
	// If the message carries a real entry id (from normalization), use it.
	// Otherwise fall back to the index for backward compatibility.
	return ((msg as unknown as Record<string, unknown>).id as string) ?? String(index);
}

function findTurns(messages: TranscriptMessage[]): Turn[] {
	const turns: Turn[] = [];
	let currentTurn: Turn | null = null;

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (!msg) continue;

		// Start of a new turn = user message
		if (msg.role === "user") {
			if (currentTurn) {
				// Close previous turn
				currentTurn.endIndex = i - 1;
				turns.push(currentTurn);
			}
			currentTurn = {
				startIndex: i,
				endIndex: i,
				messages: [msg],
				isComplete: false,
			};
		} else if (currentTurn) {
			currentTurn.messages.push(msg);
			currentTurn.endIndex = i;
		} else {
			// Message before any user message — orphan it
			currentTurn = {
				startIndex: i,
				endIndex: i,
				messages: [msg],
				isComplete: false,
			};
		}
	}

	if (currentTurn) {
		turns.push(currentTurn);
	}

	// Determine turn completeness
	for (const turn of turns) {
		const toolCallIds = new Set<string>();
		const toolResultIds = new Set<string>();
		let hasAssistant = false;

		for (const msg of turn.messages) {
			if (msg.role === "assistant") hasAssistant = true;
			if (msg.toolCalls) {
				for (const tc of msg.toolCalls) {
					toolCallIds.add(tc.id);
				}
			}
			if (msg.toolResults) {
				for (const tr of msg.toolResults) {
					toolResultIds.add(tr.id);
				}
			}
		}

		// Turn is complete if:
		// - It has a user and assistant
		// - Every tool_call has a matching tool_result
		const allToolCallsHaveResults = [...toolCallIds].every((id) => toolResultIds.has(id));
		turn.isComplete = hasAssistant && allToolCallsHaveResults;
	}

	return turns;
}

export function buildOwnCut(
	messages: TranscriptMessage[],
	opts: BuildOwnCutOptions = {},
): BuildOwnCutResult {
	if (messages.length === 0) {
		return { messagesToSummarize: [], orphans: [] };
	}

	// If firstKeptEntryId is provided, try to find it
	if (opts.firstKeptEntryId) {
		const keptIndex = messages.findIndex(
			(_msg, idx) => extractId(_msg, idx) === opts.firstKeptEntryId,
		);
		if (keptIndex >= 0) {
			// Orphan recovery: ensure we don't cut mid-turn
			const turns = findTurns(messages);
			const cutTurn = turns.find((t) => t.startIndex <= keptIndex && t.endIndex >= keptIndex);
			if (cutTurn && !cutTurn.isComplete) {
				// The kept ID is in an incomplete turn — include the full turn
				const safeCutIndex = cutTurn.startIndex;
				return {
					orphans: messages.slice(0, safeCutIndex),
					messagesToSummarize: messages.slice(safeCutIndex),
				};
			}
			return {
				orphans: messages.slice(0, keptIndex),
				messagesToSummarize: messages.slice(keptIndex),
			};
		}
		// If kept ID not found, fall through to heuristic
	}

	// Heuristic: find the last complete turn, keep everything after it
	const turns = findTurns(messages);
	const minOrphanTurns = opts.minOrphanTurns ?? 1;

	if (turns.length <= minOrphanTurns) {
		// Not enough turns to orphan any — summarize everything
		return { messagesToSummarize: messages, orphans: [] };
	}

	// Find the last complete turn that we can safely orphan
	let cutIndex = 0;
	for (let i = 0; i < turns.length - 1; i++) {
		if (turns[i]?.isComplete) {
			cutIndex = (turns[i]?.endIndex ?? 0) + 1;
		}
	}

	// Ensure we orphan at least minOrphanTurns complete turns
	let orphanCount = 0;
	for (let i = 0; i < turns.length; i++) {
		if (turns[i]?.isComplete) orphanCount++;
		if (orphanCount >= minOrphanTurns) {
			cutIndex = Math.max(cutIndex, (turns[i]?.endIndex ?? 0) + 1);
			break;
		}
	}

	// Never cut in the middle of the last turn
	const lastTurn = turns[turns.length - 1];
	if (lastTurn && !lastTurn.isComplete) {
		// Include the entire last incomplete turn in messagesToSummarize
		cutIndex = lastTurn.startIndex;
	}

	return {
		orphans: messages.slice(0, cutIndex),
		messagesToSummarize: messages.slice(cutIndex),
	};
}

/** Validates that no dangling tool calls exist in messagesToSummarize */
export function validateNoDanglingToolCalls(messages: TranscriptMessage[]): boolean {
	const callIds = new Set<string>();
	const resultIds = new Set<string>();

	for (const msg of messages) {
		if (msg.toolCalls) {
			for (const tc of msg.toolCalls) callIds.add(tc.id);
		}
		if (msg.toolResults) {
			for (const tr of msg.toolResults) resultIds.add(tr.id);
		}
	}

	return [...callIds].every((id) => resultIds.has(id));
}
