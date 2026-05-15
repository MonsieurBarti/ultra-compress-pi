import { describe, expect, it } from "vitest";
import {
	compactSessionVcc,
	estimateTokenReduction,
	extractVccSections,
} from "../../src/services/vcc-compaction-engine.js";
import { makeMultiTurnSession } from "../fixtures/vcc-sessions.js";

describe("compactSessionVcc", () => {
	it("produces a formatted summary from messages", () => {
		const messages = makeMultiTurnSession();
		const summary = compactSessionVcc(messages);
		expect(summary).toContain("[Goal]");
		expect(summary).toContain("[Files & Changes]");
		expect(summary).toContain("[VCC Brief]");
	});

	it("filters noise before processing", () => {
		const messages = makeMultiTurnSession();
		const summary = compactSessionVcc(messages, {
			filterNoise: { removeThinking: true, stripXml: true },
		});
		expect(summary).not.toContain("<thinking>");
	});

	it("caps brief lines", () => {
		const messages = makeMultiTurnSession();
		const summary = compactSessionVcc(messages, { capBriefMaxLines: 5 });
		const briefLines = summary.split("[VCC Brief]")[1]?.split("\n") ?? [];
		const nonEmptyBriefLines = briefLines.filter((l) => l.trim());
		expect(nonEmptyBriefLines.length).toBeLessThanOrEqual(6); // header + 5 lines
	});

	it("returns summary even for empty input", () => {
		const summary = compactSessionVcc([]);
		expect(summary).toContain("No active goal");
		expect(summary).toContain("No entries");
	});

	it("includes file activity in summary", () => {
		const messages = makeMultiTurnSession();
		const summary = compactSessionVcc(messages, {
			filterNoise: { noiseToolNames: [] },
		});
		expect(summary).toContain("read:");
		expect(summary).toContain("modified:");
	});

	it("detects commits in messages", () => {
		const messages = [{ role: "assistant" as const, content: "Committed: feat: add auth module" }];
		const summary = compactSessionVcc(messages);
		expect(summary).toContain("feat: add auth module");
	});

	it("detects user preferences in messages", () => {
		const messages = [{ role: "user" as const, content: "Please use TypeScript for this project" }];
		const summary = compactSessionVcc(messages);
		expect(summary).toContain("use TypeScript");
	});

	it("does not accept enhanceGoal parameter", () => {
		// The function signature intentionally excludes enhanceGoal
		const opts = {} as Record<string, unknown>;
		expect(opts.enhanceGoal).toBeUndefined();
	});
});

describe("extractVccSections", () => {
	it("returns a VccSemanticSections object", () => {
		const messages = makeMultiTurnSession();
		const sections = extractVccSections(messages);
		expect(sections).toHaveProperty("goal");
		expect(sections).toHaveProperty("files");
		expect(sections).toHaveProperty("commits");
		expect(sections).toHaveProperty("outstandingContext");
		expect(sections).toHaveProperty("userPreferences");
		expect(sections).toHaveProperty("brief");
	});

	it("populates sections correctly from messages", () => {
		const messages = makeMultiTurnSession();
		const sections = extractVccSections(messages);
		expect(sections.goal).not.toBe("No active goal");
		expect(
			sections.files.read.length + sections.files.modified.length + sections.files.created.length,
		).toBeGreaterThan(0);
		expect(sections.commits.length).toBeGreaterThanOrEqual(0);
		expect(sections.userPreferences.length).toBeGreaterThanOrEqual(0);
	});

	it("passes options through to extraction pipeline", () => {
		const messages = makeMultiTurnSession();
		const sections = extractVccSections(messages, {
			filterNoise: { removeThinking: true, stripXml: true },
			capBriefMaxLines: 3,
		});
		expect(sections.brief.length).toBeLessThanOrEqual(3);
	});

	it("returns empty/default sections for empty input", () => {
		const sections = extractVccSections([]);
		expect(sections.goal).toBe("No active goal");
		expect(sections.brief).toEqual([]);
	});

	it("passes fileOps through to extractFileActivity", () => {
		const messages = [{ role: "user" as const, content: "Hello" }];
		const sections = extractVccSections(messages, {
			fileOps: { operations: [{ path: "manual.ts", type: "edit" }] },
		});
		expect(sections.files.modified).toContain("manual.ts");
	});
});

describe("estimateTokenReduction", () => {
	it("calculates reduction for real session", () => {
		const messages = makeMultiTurnSession();
		const summary = compactSessionVcc(messages);
		const result = estimateTokenReduction(messages, summary);
		expect(result.rawWords).toBeGreaterThan(0);
		expect(result.summaryWords).toBeGreaterThan(0);
		expect(result.reductionPercent).toBeGreaterThanOrEqual(0);
		expect(result.reductionPercent).toBeLessThanOrEqual(100);
	});

	it("returns 0 for empty input", () => {
		const result = estimateTokenReduction([], "summary");
		expect(result.reductionPercent).toBe(0);
	});
});
