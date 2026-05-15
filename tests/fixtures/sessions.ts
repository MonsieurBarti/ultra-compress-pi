import type { TranscriptMessage } from "../../src/types/session-compact.js";

export function simpleConversation(): TranscriptMessage[] {
	return [
		{ role: "user", content: "I want to add session compaction to my PI extension" },
		{ role: "assistant", content: "I'll help you build that. Let's start with the config store." },
		{
			role: "tool_call",
			content: "",
			toolCalls: [
				{ id: "1", name: "writeFile", arguments: { path: "src/services/session-config.ts" } },
			],
		},
		{ role: "tool_result", content: "file written", toolResults: [{ id: "1", content: "ok" }] },
	];
}

export function conversationWithPreferences(): TranscriptMessage[] {
	return [
		{ role: "user", content: "Use pure algorithmic mode, no LLM for goal extraction" },
		{ role: "assistant", content: "Got it. Algorithmic mode enabled." },
		{ role: "user", content: "Keep session compaction separate from runtime levels" },
	];
}

export function emptyConversation(): TranscriptMessage[] {
	return [];
}
