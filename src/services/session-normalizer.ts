import type { AgentMessage, SessionEntry, TranscriptMessage } from "../types/session-compact.js";

function normalizeRole(role: string): TranscriptMessage["role"] {
	switch (role) {
		case "user":
			return "user";
		case "assistant":
			return "assistant";
		case "tool":
		case "toolResult":
			return "tool_result";
		case "system":
			return "system";
		default:
			return "thinking";
	}
}

function extractTextFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				if (block && typeof block === "object") {
					if (block.type === "text" && typeof block.text === "string") return block.text;
					if (block.type === "thinking" && typeof block.thinking === "string")
						return block.thinking;
				}
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}
	return "";
}

function extractToolCallsFromContent(
	content: unknown,
): Array<{ id: string; name: string; arguments: Record<string, unknown> }> | undefined {
	if (!Array.isArray(content)) return undefined;
	const calls = content
		.filter((block) => block && typeof block === "object" && block.type === "toolCall")
		.map((block) => ({
			id: String(block.id ?? "?"),
			name: String(block.name ?? "?"),
			arguments: (block.arguments ?? {}) as Record<string, unknown>,
		}));
	return calls.length > 0 ? calls : undefined;
}

function normalizeSingleMessage(msg: AgentMessage): TranscriptMessage | null {
	const role = normalizeRole(msg.role);
	if (role === "system") return null;

	const content = extractTextFromContent(msg.content);
	const contentToolCalls = extractToolCallsFromContent(msg.content);

	if (!content.trim() && !msg.toolCalls && !contentToolCalls && !msg.toolCallId) return null;

	const normalized: TranscriptMessage = { role, content };

	const allToolCalls = msg.toolCalls ?? contentToolCalls;
	if (allToolCalls && allToolCalls.length > 0) {
		normalized.toolCalls = allToolCalls.map((tc) => ({
			id: tc.id ?? "?",
			name: tc.name ?? "?",
			arguments: tc.arguments ?? {},
		}));
		if (!normalized.content.trim()) normalized.role = "tool_call";
	}

	if (msg.toolCallId) {
		const resultContent = msg.toolResults ? String(msg.toolResults) : content;
		normalized.toolResults = [{ id: msg.toolCallId, content: resultContent }];
	}

	return normalized;
}

export function normalizeAgentMessages(messages: AgentMessage[]): TranscriptMessage[] {
	const result: TranscriptMessage[] = [];
	for (const msg of messages) {
		const normalized = normalizeSingleMessage(msg);
		if (normalized) result.push(normalized);
	}
	return result;
}

export function normalizeSessionEntries(entries: SessionEntry[]): TranscriptMessage[] {
	const result: TranscriptMessage[] = [];
	for (const entry of entries) {
		// PI session JSONL entries have type: "message" with the actual
		// AgentMessage nested under entry.message.
		// Backward-compatible: flat entries use entry.type as role directly.
		const message =
			entry.type === "message" &&
			entry.message &&
			typeof entry.message === "object" &&
			"role" in entry.message
				? entry.message
				: ({ role: entry.type, content: entry.content } as AgentMessage);

		const normalized = normalizeSingleMessage(message);
		if (normalized) result.push(normalized);
	}
	return result;
}
