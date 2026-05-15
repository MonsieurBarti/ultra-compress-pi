import { describe, expect, it } from "vitest";
import { buildBrief } from "../../src/services/extract/brief.js";
import {
	makeAssistantMessage,
	makeMultiTurnSession,
	makeRepeatedToolSession,
	makeThinkingMessage,
	makeToolResultMessage,
	makeUserMessage,
} from "../fixtures/vcc-sessions.js";

describe("buildBrief", () => {
	it("formats user messages with [user] prefix", () => {
		const messages = [makeUserMessage("Hello world")];
		const lines = buildBrief(messages);
		expect(lines[0]?.content).toContain("[user]");
		expect(lines[0]?.content).toContain("Hello world");
	});

	it("formats assistant messages with [assistant] prefix", () => {
		const messages = [makeAssistantMessage("I'll help")];
		const lines = buildBrief(messages);
		expect(lines[0]?.content).toContain("[assistant]");
	});

	it("skips thinking blocks", () => {
		const messages = [
			makeUserMessage("Do something"),
			makeThinkingMessage("deep reasoning here"),
			makeAssistantMessage("Done"),
		];
		const lines = buildBrief(messages);
		expect(lines.some((l) => l.content.includes("deep reasoning"))).toBe(false);
	});

	it("formats tool calls as one-liners", () => {
		const messages = [
			makeAssistantMessage("Reading file", [
				{ id: "1", name: "readFile", arguments: { path: "src/main.ts" } },
			]),
		];
		const lines = buildBrief(messages);
		expect(lines[0]?.content).toContain("readFile");
		expect(lines[0]?.content).toContain("src/main.ts");
	});

	it("formats bash commands with compression", () => {
		const messages = [
			makeAssistantMessage("Running tests", [
				{ id: "1", name: "bash", arguments: { command: "npm test\nnpm run lint" } },
			]),
		];
		const lines = buildBrief(messages);
		expect(lines[0]?.content).toContain("bash");
		expect(lines[0]?.content).toContain("(+1 lines)");
	});

	it("caps tool calls per turn to maxToolLines", () => {
		const messages: ReturnType<typeof makeAssistantMessage>[] = [];
		for (let i = 0; i < 12; i++) {
			messages.push(
				makeAssistantMessage(`Step ${i}`, [
					{ id: String(i), name: "readFile", arguments: { path: `file${i}.ts` } },
				]),
			);
		}
		const lines = buildBrief(messages, { maxToolLines: 8 });
		const toolLines = lines.filter((l) => l.role === "tool");
		expect(toolLines.length).toBeLessThanOrEqual(8);
	});

	it("truncates long text to word budget", () => {
		const longText = "word ".repeat(500);
		const messages = [makeUserMessage(longText)];
		const lines = buildBrief(messages, { maxUserWords: 50 });
		expect(lines[0]?.content).toContain("...");
	});

	it("tracks turn numbers", () => {
		const messages = makeMultiTurnSession();
		const lines = buildBrief(messages);
		expect(lines.some((l) => l.turn === 1)).toBe(true);
		expect(lines.some((l) => l.turn === 2)).toBe(true);
	});

	it("deduplicates identical tool calls within a turn", () => {
		const messages = makeRepeatedToolSession();
		const lines = buildBrief(messages);
		const toolLines = lines.filter((l) => l.content.includes("schema.sql"));
		expect(toolLines.length).toBeGreaterThanOrEqual(1);
	});

	it("returns empty for empty input", () => {
		expect(buildBrief([])).toHaveLength(0);
	});

	it("handles tool results", () => {
		const messages = [makeToolResultMessage("File updated successfully")];
		const lines = buildBrief(messages);
		expect(lines[0]?.role).toBe("tool_result");
		expect(lines[0]?.content).toContain("→");
	});
});
