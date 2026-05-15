import { describe, expect, it } from "vitest";
import { buildOwnCut, validateNoDanglingToolCalls } from "../../src/services/build-own-cut.js";
import type { TranscriptMessage } from "../../src/types/session-compact.js";
import {
	makeAssistantMessage,
	makeTranscriptMessage,
	makeUserMessage,
} from "../fixtures/vcc-sessions.js";

/** Helper for tool results with a specific ID to match tool calls */
function makeToolResultWithId(content: string, id: string): TranscriptMessage {
	return makeTranscriptMessage("tool_result", content, {
		toolResults: [{ id, content }],
	});
}

describe("buildOwnCut", () => {
	it("returns empty for empty input", () => {
		const result = buildOwnCut([]);
		expect(result.orphans).toHaveLength(0);
		expect(result.messagesToSummarize).toHaveLength(0);
	});

	it("summarizes everything when only one turn exists", () => {
		const messages = [makeUserMessage("Hello"), makeAssistantMessage("Hi there")];
		const result = buildOwnCut(messages);
		expect(result.orphans).toHaveLength(0);
		expect(result.messagesToSummarize).toHaveLength(2);
	});

	it("orphans complete turns and summarizes the last", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
		];
		const result = buildOwnCut(messages);
		expect(result.orphans).toHaveLength(2);
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.messagesToSummarize[0]?.content).toContain("Turn 2");
	});

	it("includes incomplete last turn fully in messagesToSummarize", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Processing...", [
				{ id: "1", name: "readFile", arguments: { path: "src/main.ts" } },
			]),
			// No tool result — incomplete turn
		];
		const result = buildOwnCut(messages);
		// Turn 0 complete (2 msgs) orphaned; turn 1 incomplete (2 msgs) summarized
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.orphans).toHaveLength(2);
		expect(result.messagesToSummarize.some((m) => m.content.includes("Turn 2"))).toBe(true);
	});

	it("handles multi-turn sessions with tool calls", () => {
		const messages = [
			makeUserMessage("Implement auth"),
			makeAssistantMessage("Reading auth file...", [
				{ id: "tc-1", name: "readFile", arguments: { path: "src/auth.ts" } },
			]),
			makeToolResultWithId("export function verify() {}", "tc-1"),
			makeUserMessage("Switch to OAuth2"),
			makeAssistantMessage("Reading OAuth docs...", [
				{ id: "tc-2", name: "readFile", arguments: { path: "docs/oauth.md" } },
			]),
			makeToolResultWithId("# OAuth2 Setup Guide", "tc-2"),
		];
		const result = buildOwnCut(messages);
		// Turn 0 complete (3 msgs) orphaned; turn 1 complete (3 msgs) summarized
		expect(result.messagesToSummarize).toHaveLength(3);
		expect(result.orphans).toHaveLength(3);
		expect(validateNoDanglingToolCalls(result.messagesToSummarize)).toBe(true);
	});

	it("never produces dangling tool calls", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Done"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Loading...", [
				{ id: "tc-1", name: "readFile", arguments: { path: "a.ts" } },
			]),
			makeToolResultWithId("content of a.ts", "tc-1"),
			makeUserMessage("Turn 3"),
			makeAssistantMessage("Processing", [
				{ id: "tc-2", name: "editFile", arguments: { path: "b.ts" } },
			]),
			makeToolResultWithId("edited b.ts", "tc-2"),
		];
		const result = buildOwnCut(messages);
		expect(result.messagesToSummarize).toHaveLength(3);
		expect(result.orphans).toHaveLength(5);
		expect(validateNoDanglingToolCalls(result.messagesToSummarize)).toBe(true);
	});

	it("respects firstKeptEntryId when found", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
		];
		const result = buildOwnCut(messages, { firstKeptEntryId: "2" });
		expect(result.orphans).toHaveLength(2);
		expect(result.messagesToSummarize).toHaveLength(2);
	});

	it("falls back to heuristic when firstKeptEntryId not found", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
		];
		const result = buildOwnCut(messages, { firstKeptEntryId: "nonexistent" });
		// Should still produce a reasonable split
		expect(result.messagesToSummarize.length).toBeGreaterThan(0);
		expect(result.orphans.length).toBeGreaterThanOrEqual(0);
	});

	it("handles orphan recovery with empty firstKeptEntryId", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
		];
		const result = buildOwnCut(messages, { firstKeptEntryId: "" });
		// Empty string is invalid — should fall back to heuristic
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.orphans).toHaveLength(2);
	});

	it("respects minOrphanTurns option", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
			makeUserMessage("Turn 3"),
			makeAssistantMessage("Response 3"),
		];
		const result = buildOwnCut(messages, { minOrphanTurns: 2 });
		// Should orphan at least 2 complete turns
		expect(result.orphans).toHaveLength(4);
		expect(result.messagesToSummarize).toHaveLength(2);
	});

	it("preserves turn chains: user → assistant → toolCalls → toolResults", () => {
		const messages = [
			makeUserMessage("Check files"),
			makeAssistantMessage("Reading...", [
				{ id: "tc-1", name: "readFile", arguments: { path: "a.ts" } },
				{ id: "tc-2", name: "readFile", arguments: { path: "b.ts" } },
			]),
			makeToolResultWithId("content a", "tc-1"),
			makeToolResultWithId("content b", "tc-2"),
			makeUserMessage("Next turn"),
			makeAssistantMessage("Done"),
		];
		const result = buildOwnCut(messages);
		expect(validateNoDanglingToolCalls(result.messagesToSummarize)).toBe(true);
		// First turn complete (4 msgs) is orphaned; second turn (2 msgs) summarized
		expect(result.orphans).toHaveLength(4);
		expect(result.messagesToSummarize).toHaveLength(2);
	});

	it("recovers when firstKeptEntryId points inside an incomplete turn", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Processing...", [
				{ id: "tc-1", name: "readFile", arguments: { path: "src/main.ts" } },
			]),
			// No tool result — incomplete turn
		];
		// Point firstKeptEntryId at message index 3 (inside incomplete turn)
		const result = buildOwnCut(messages, { firstKeptEntryId: "3" });
		// Turn 0 (2 msgs) orphaned; turn 1 incomplete (2 msgs) summarized
		expect(result.orphans).toHaveLength(2);
		expect(result.messagesToSummarize).toHaveLength(2);
	});
});

describe("validateNoDanglingToolCalls", () => {
	it("passes when all tool calls have results", () => {
		const messages = [
			makeAssistantMessage("Reading", [
				{ id: "tc-1", name: "readFile", arguments: { path: "a.ts" } },
			]),
			makeToolResultWithId("content", "tc-1"),
		];
		expect(validateNoDanglingToolCalls(messages)).toBe(true);
	});

	it("fails when tool call lacks result", () => {
		const messages = [
			makeAssistantMessage("Reading", [
				{ id: "tc-1", name: "readFile", arguments: { path: "a.ts" } },
			]),
		];
		expect(validateNoDanglingToolCalls(messages)).toBe(false);
	});

	it("passes for messages without tool calls", () => {
		expect(validateNoDanglingToolCalls([makeUserMessage("Hello")])).toBe(true);
	});
});

describe("buildOwnCut with CompactionPreparation", () => {
	it("produces firstKeptEntryId that matches summary length", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Response 1"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Response 2"),
		];
		const result = buildOwnCut(messages);
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.orphans).toHaveLength(2);
		expect(result.orphans.length + result.messagesToSummarize.length).toBe(messages.length);
	});

	it("handles split-turn scenario", () => {
		const messages = [
			makeUserMessage("Start task"),
			makeAssistantMessage("Working...", [
				{ id: "tc-1", name: "bash", arguments: { command: "ls" } },
			]),
			// No tool result yet — this is a split turn
		];
		const result = buildOwnCut(messages);
		// Split turn should stay in messagesToSummarize, not orphaned
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.orphans).toHaveLength(0);
		expect(result.messagesToSummarize.some((m) => m.content.includes("Working"))).toBe(true);
		expect(result.messagesToSummarize.some((m) => m.toolCalls && m.toolCalls.length > 0)).toBe(
			true,
		);
	});

	it("handles compact-all sentinel (empty firstKeptEntryId)", () => {
		const messages = [
			makeUserMessage("Turn 1"),
			makeAssistantMessage("Done"),
			makeUserMessage("Turn 2"),
			makeAssistantMessage("Done"),
		];
		// Empty string simulates "compact-all" sentinel
		const result = buildOwnCut(messages, { firstKeptEntryId: "" });
		// Should fall back to heuristic and still produce valid output
		expect(result.messagesToSummarize).toHaveLength(2);
		expect(result.orphans).toHaveLength(2);
		expect(result.orphans.length + result.messagesToSummarize.length).toBe(messages.length);
	});
});
