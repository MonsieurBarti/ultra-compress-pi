import { addCharsSaved, loadState } from "../services/state-store.js";
import { estimateCharsSaved } from "../services/stats.js";

export interface AgentEndEvent {
	content?: unknown;
	stopReason?: string;
}

export interface AgentEndContext {
	cwd: string;
}

export type AgentEndHook = (event: AgentEndEvent, ctx: AgentEndContext) => Promise<void>;

// Best-effort extraction of a text length from a PI agent_end event. PI's
// actual event shape is runtime-dependent; we accept either a string `content`
// or an array of `{ type: "text", text: string }` parts (the pi-ai shape).
// Returns 0 when nothing extractable is present — never throws.
function extractContentLength(content: unknown): number {
	if (typeof content === "string") return content.length;
	if (Array.isArray(content)) {
		let total = 0;
		for (const part of content) {
			if (
				part &&
				typeof part === "object" &&
				(part as { type?: unknown }).type === "text" &&
				typeof (part as { text?: unknown }).text === "string"
			) {
				total += (part as { text: string }).text.length;
			}
		}
		return total;
	}
	return 0;
}

export function createAgentEndHook(): AgentEndHook {
	return async function onAgentEnd(event, ctx) {
		const state = await loadState(ctx.cwd);
		if (state.level === "off") return;
		const chars = extractContentLength(event.content);
		if (chars === 0) return;
		const saved = estimateCharsSaved(chars, state.level);
		if (saved > 0) {
			await addCharsSaved(saved, ctx.cwd);
		}
	};
}
