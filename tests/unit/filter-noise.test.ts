import { describe, expect, it } from "vitest";
import { filterNoise } from "../../src/services/filter-noise.js";
import type { TranscriptMessage } from "../../src/types/session-compact.js";

function makeMessages(): TranscriptMessage[] {
	return [
		{ role: "user", content: "fix the auth bug" },
		{ role: "thinking", content: "analyzing the codebase..." },
		{
			role: "assistant",
			content: "I'll check the auth module",
			toolCalls: [{ id: "1", name: "readFile", arguments: { path: "src/auth.ts" } }],
		},
		{ role: "tool_result", content: "export function verify() { ... }" },
		{
			role: "assistant",
			content: "<thinking>deep reasoning</thinking> The fix is to add validation.",
		},
	];
}

describe("filterNoise", () => {
	it("removes thinking blocks by default", () => {
		const result = filterNoise(makeMessages());
		expect(result.some((m) => m.role === "thinking")).toBe(false);
	});

	it("preserves thinking blocks when removeThinking is false", () => {
		const result = filterNoise(makeMessages(), { removeThinking: false });
		expect(result.some((m) => m.role === "thinking")).toBe(true);
	});

	it("strips XML tags from content", () => {
		const result = filterNoise(makeMessages());
		const msg = result.find((m) => m.role === "assistant" && m.content.includes("The fix"));
		expect(msg?.content).not.toContain("<thinking>");
		expect(msg?.content).not.toContain("</thinking>");
		expect(msg?.content).toContain("The fix is to add validation.");
	});

	it("filters noise tool calls", () => {
		const result = filterNoise(makeMessages());
		const msg = result.find((m) => m.role === "assistant" && m.toolCalls);
		expect(msg?.toolCalls).toHaveLength(0);
	});

	it("preserves non-noise tool calls", () => {
		const messages: TranscriptMessage[] = [
			{
				role: "assistant",
				content: "editing",
				toolCalls: [{ id: "1", name: "editFile", arguments: { path: "src/main.ts" } }],
			},
		];
		const result = filterNoise(messages);
		expect(result[0]?.toolCalls).toHaveLength(1);
		expect(result[0]?.toolCalls?.[0]?.name).toBe("editFile");
	});

	it("returns empty array for empty input", () => {
		expect(filterNoise([])).toEqual([]);
	});

	it("does not mutate original messages", () => {
		const original = makeMessages();
		filterNoise(original);
		expect(original[1]?.role).toBe("thinking");
		expect(original[4]?.content).toContain("<thinking>");
	});
});
