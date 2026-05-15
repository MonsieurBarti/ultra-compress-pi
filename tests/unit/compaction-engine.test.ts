import { describe, expect, it } from "vitest";
import { compactSession, formatSummary } from "../../src/services/compaction-engine.js";
import {
	conversationWithPreferences,
	emptyConversation,
	simpleConversation,
} from "../fixtures/sessions.js";

describe("compaction-engine", () => {
	it("produces all 5 semantic sections", () => {
		const summary = compactSession(simpleConversation());
		expect(summary).toContain("[Goal]");
		expect(summary).toContain("[Files & Changes]");
		expect(summary).toContain("[Commits]");
		expect(summary).toContain("[Outstanding Context]");
		expect(summary).toContain("[User Preferences]");
		expect(summary).toContain("--- Transcript ---");
	});

	it("handles empty conversation gracefully", () => {
		const summary = compactSession(emptyConversation());
		expect(summary).toContain("[Goal]");
		expect(summary).toContain("No active goal");
	});

	it("extracts user preferences", () => {
		const summary = compactSession(conversationWithPreferences());
		expect(summary).toContain("[User Preferences]");
		expect(summary).toContain("pure algorithmic mode");
		expect(summary).toContain("no LLM for goal extraction");
	});

	it("collapses tool calls into one-liners", () => {
		const summary = compactSession(simpleConversation());
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
});
