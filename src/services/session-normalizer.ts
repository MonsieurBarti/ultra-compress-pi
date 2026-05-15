import type { AgentMessage, SessionEntry, TranscriptMessage } from "../types/session-compact.js";

function normalizeRole(role: string): TranscriptMessage["role"] {
	switch (role) {
		case "user":
			return "user";
		case "assistant":
			return "assistant";
		case "tool":
			return "tool_result";
		case "system":
			return "system";
		default:
			return "thinking";
	}
}

export function normalizeAgentMessages(messages: AgentMessage[]): TranscriptMessage[] {
	const result: TranscriptMessage[] = [];
	for (const msg of messages) {
		const role = normalizeRole(msg.role);
		if (role === "system") continue;
		const content = typeof msg.content === "string" ? msg.content : "";
		if (!content.trim() && !msg.toolCalls) continue;

		const normalized: TranscriptMessage = { role, content };

		if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
			normalized.toolCalls = msg.toolCalls.map((tc) => ({
				id: tc.id ?? "?",
				name: tc.name ?? "?",
				arguments: tc.arguments ?? {},
			}));
			if (!normalized.content.trim()) normalized.role = "tool_call";
		}

		if (msg.toolCallId && msg.toolResults) {
			normalized.toolResults = [{ id: msg.toolCallId, content: String(msg.toolResults) }];
		}

		result.push(normalized);
	}
	return result;
}

export function normalizeSessionEntries(entries: SessionEntry[]): TranscriptMessage[] {
	const result: TranscriptMessage[] = [];
	for (const entry of entries) {
		const role = normalizeRole(entry.type);
		if (role === "system") continue;
		const content = typeof entry.content === "string" ? entry.content : "";
		if (!content.trim()) continue;
		result.push({ role, content });
	}
	return result;
}
