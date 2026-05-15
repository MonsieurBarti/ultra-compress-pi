import { describe, expect, it } from "vitest";
import { mergeWithPrevious, parsePreviousSummary } from "../../src/services/bounded-merge.js";
import type { SemanticSections } from "../../src/types/session-compact.js";

describe("bounded-merge", () => {
	function makeSections(partial?: Partial<SemanticSections>): SemanticSections {
		return {
			goal: "Test goal",
			filesAndChanges: ["src/index.ts"],
			commits: ["feat: initial commit"],
			outstandingContext: ["Need to add tests"],
			userPreferences: ["Use algorithmic mode"],
			transcript: ["1. user: hello"],
			...partial,
		};
	}

	it("parses a full previous summary", () => {
		const summary = [
			"[Goal]",
			"Build compaction engine",
			"",
			"[Files & Changes]",
			"- src/index.ts",
			"- src/engine.ts",
			"",
			"[Commits]",
			"- feat: initial",
			"",
			"[Outstanding Context]",
			"- Add tests",
			"",
			"[User Preferences]",
			"- Use algorithmic mode",
			"",
			"--- Transcript ---",
			"1. user: hello",
			"2. assistant: hi",
		].join("\n");
		const parsed = parsePreviousSummary(summary);
		expect(parsed.goal).toBe("Build compaction engine");
		expect(parsed.filesAndChanges).toEqual(["src/index.ts", "src/engine.ts"]);
		expect(parsed.commits).toEqual(["feat: initial"]);
		expect(parsed.outstandingContext).toEqual(["Add tests"]);
		expect(parsed.userPreferences).toEqual(["Use algorithmic mode"]);
		expect(parsed.transcript).toEqual(["1. user: hello", "2. assistant: hi"]);
	});

	it("handles empty previous summary", () => {
		const parsed = parsePreviousSummary("");
		expect(parsed.goal).toBe("");
		expect(parsed.filesAndChanges).toEqual([]);
		expect(parsed.transcript).toEqual([]);
	});

	it("handles partial previous summary (missing sections)", () => {
		const summary = ["[Goal]", "Only goal", "", "--- Transcript ---", "1. user: hi"].join("\n");
		const parsed = parsePreviousSummary(summary);
		expect(parsed.goal).toBe("Only goal");
		expect(parsed.filesAndChanges).toEqual([]);
		expect(parsed.transcript).toEqual(["1. user: hi"]);
	});

	it("merges sticky sections (goal accumulates, preferences dedupe)", () => {
		const previous = makeSections({
			goal: "Old goal",
			userPreferences: ["Use algorithmic mode", "Keep it simple"],
			transcript: ["1. user: old"],
		});
		const current = makeSections({
			goal: "New goal",
			userPreferences: ["Use algorithmic mode", "Add LLM later"],
			transcript: ["2. user: new"],
		});
		const merged = mergeWithPrevious(previous, current);
		expect(merged.goal).toBe("New goal"); // Goal overwrites
		expect(merged.userPreferences).toContain("Use algorithmic mode");
		expect(merged.userPreferences).toContain("Keep it simple");
		expect(merged.userPreferences).toContain("Add LLM later");
		expect(merged.transcript).toEqual(["1. user: old", "2. user: new"]);
	});

	it("replaces volatile sections with current data", () => {
		const previous = makeSections({
			filesAndChanges: ["old.ts"],
			commits: ["old: commit"],
			outstandingContext: ["Old task"],
		});
		const current = makeSections({
			filesAndChanges: ["new.ts"],
			commits: ["new: commit"],
			outstandingContext: ["New task"],
		});
		const merged = mergeWithPrevious(previous, current);
		expect(merged.filesAndChanges).toEqual(["new.ts"]);
		expect(merged.commits).toEqual(["new: commit"]);
		expect(merged.outstandingContext).toEqual(["New task"]);
	});

	it("handles 'None' sentinel in previous sections", () => {
		const previous = [
			"[Goal]",
			"Some goal",
			"",
			"[Files & Changes]",
			"None",
			"",
			"[Commits]",
			"None",
			"",
			"[Outstanding Context]",
			"None",
			"",
			"[User Preferences]",
			"None",
		].join("\n");
		const current = makeSections();
		const merged = mergeWithPrevious(parsePreviousSummary(previous), current);
		expect(merged.filesAndChanges).toEqual(["src/index.ts"]);
		expect(merged.commits).toEqual(["feat: initial commit"]);
	});
});
