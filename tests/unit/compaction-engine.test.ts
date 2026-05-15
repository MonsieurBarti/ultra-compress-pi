import { describe, expect, it } from "vitest";
import {
	compactSession,
	extractSections,
	formatSummary,
} from "../../src/services/compaction-engine.js";
import {
	conversationWithPreferences,
	emptyConversation,
	simpleConversation,
} from "../fixtures/sessions.js";

describe("compaction-engine", () => {
	it("produces all 5 semantic sections", async () => {
		const summary = await compactSession(simpleConversation());
		expect(summary).toContain("[Goal]");
		expect(summary).toContain("[Files & Changes]");
		expect(summary).toContain("[Commits]");
		expect(summary).toContain("[Outstanding Context]");
		expect(summary).toContain("[User Preferences]");
		expect(summary).toContain("--- Transcript ---");
	});

	it("handles empty conversation gracefully", async () => {
		const summary = await compactSession(emptyConversation());
		expect(summary).toContain("[Goal]");
		expect(summary).toContain("No active goal");
	});

	it("extracts user preferences", async () => {
		const summary = await compactSession(conversationWithPreferences());
		expect(summary).toContain("[User Preferences]");
		expect(summary).toContain("pure algorithmic mode");
		expect(summary).toContain("no LLM for goal extraction");
	});

	it("collapses tool calls into one-liners", async () => {
		const summary = await compactSession(simpleConversation());
		expect(summary).toContain("writeFile");
		expect(summary).toContain("(#1)");
	});

	it("round-trips through formatSummary", () => {
		const sections = {
			goal: "Test goal",
			filesAndChanges: ["src/index.ts"],
			commits: [],
			outstandingContext: [],
			userPreferences: [],
			transcript: ["1. user: hello"],
		};
		const formatted = formatSummary(sections);
		expect(formatted).toContain("[Goal]");
		expect(formatted).toContain("Test goal");
		expect(formatted).toContain("src/index.ts");
	});

	it("extracts multiple paths from tool call args.paths array", async () => {
		const messages = [
			{
				role: "tool_call" as const,
				content: "",
				toolCalls: [
					{
						id: "1",
						name: "editFiles",
						arguments: { paths: ["src/a.ts", "src/b.ts"] },
					},
				],
			},
		];
		const sections = await extractSections(messages);
		expect(sections.filesAndChanges).toContain("src/a.ts");
		expect(sections.filesAndChanges).toContain("src/b.ts");
	});

	it("extracts inline file paths via regex", async () => {
		const messages = [
			{
				role: "assistant" as const,
				content: "Check src/services/engine.ts and tests/unit/engine.test.ts",
			},
		];
		const sections = await extractSections(messages);
		expect(sections.filesAndChanges).toContain("src/services/engine.ts");
		expect(sections.filesAndChanges).toContain("tests/unit/engine.test.ts");
	});

	it("extracts commit messages", async () => {
		const messages = [
			{ role: "user" as const, content: "commit: feat: add new feature" },
			{ role: "assistant" as const, content: "committed: fix: bug resolved" },
		];
		const sections = await extractSections(messages);
		expect(sections.commits).toContain("feat: add new feature");
		expect(sections.commits).toContain("fix: bug resolved");
	});

	it("extracts TODO/FIXME as outstanding context", async () => {
		const messages = [
			{ role: "assistant" as const, content: "TODO: add edge case tests" },
			{ role: "user" as const, content: "FIXME: handle null pointer" },
		];
		const sections = await extractSections(messages);
		expect(sections.outstandingContext).toContain("add edge case tests");
		expect(sections.outstandingContext).toContain("handle null pointer");
	});

	it("truncates very long transcript lines", async () => {
		const longContent = "x".repeat(500);
		const messages = [{ role: "user" as const, content: longContent }];
		const sections = await extractSections(messages);
		const transcriptLine = sections.transcript[0];
		expect(transcriptLine).toBeDefined();
		expect(transcriptLine).toContain("...");
		expect(transcriptLine?.length).toBeLessThan(300);
	});
});
