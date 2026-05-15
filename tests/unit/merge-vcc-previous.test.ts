import { describe, expect, it } from "vitest";
import type { VccSemanticSections } from "../../src/services/format-vcc-summary.js";
import { injectRecallNote, mergeWithPreviousVcc } from "../../src/services/merge-vcc-previous.js";

function makeSections(overrides: Partial<VccSemanticSections> = {}): VccSemanticSections {
	return {
		goal: "",
		files: { read: [], modified: [], created: [] },
		commits: [],
		outstandingContext: [],
		userPreferences: [],
		brief: [],
		...overrides,
	};
}

describe("mergeWithPreviousVcc", () => {
	it("keeps current goal when present", () => {
		const previous = makeSections({ goal: "Old goal" });
		const current = makeSections({ goal: "New goal" });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.goal).toBe("New goal");
	});

	it("falls back to previous goal when current is empty", () => {
		const previous = makeSections({ goal: "Old goal" });
		const current = makeSections({ goal: "" });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.goal).toBe("Old goal");
	});

	it("deduplicates user preferences", () => {
		const previous = makeSections({ userPreferences: ["Use JWT", "TypeScript"] });
		const current = makeSections({ userPreferences: ["TypeScript", "Biome"] });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.userPreferences).toEqual(["Use JWT", "TypeScript", "Biome"]);
	});

	it("replaces volatile fields (commits, context) with current", () => {
		const previous = makeSections({ commits: ["old"], outstandingContext: ["old"] });
		const current = makeSections({ commits: ["new"], outstandingContext: ["new"] });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.commits).toEqual(["new"]);
		expect(merged.outstandingContext).toEqual(["new"]);
	});

	it("merges file activity with modified sticky", () => {
		const previous = makeSections({ files: { read: ["a.ts"], modified: ["b.ts"], created: [] } });
		const current = makeSections({
			files: { read: ["c.ts"], modified: ["d.ts"], created: ["e.ts"] },
		});
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.files.modified).toContain("b.ts");
		expect(merged.files.modified).toContain("d.ts");
		expect(merged.files.read).toContain("c.ts");
		expect(merged.files.created).toContain("e.ts");
	});

	it("drops modified files from read and created sets", () => {
		const previous = makeSections({ files: { read: [], modified: ["x.ts"], created: [] } });
		const current = makeSections({ files: { read: ["x.ts"], modified: [], created: ["x.ts"] } });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.files.read).not.toContain("x.ts");
		expect(merged.files.created).not.toContain("x.ts");
	});

	it("rolls brief keeping tail", () => {
		const previous = makeSections({
			brief: Array.from({ length: 100 }, (_, i) => ({
				role: "user",
				content: `old-${i}`,
				turn: i,
			})),
		});
		const current = makeSections({
			brief: Array.from({ length: 50 }, (_, i) => ({
				role: "user",
				content: `new-${i}`,
				turn: i + 100,
			})),
		});
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.brief.length).toBeLessThanOrEqual(120);
		expect(merged.brief.some((b) => b.content.startsWith("new-"))).toBe(true);
	});

	it("deduplicates recall notes", () => {
		const previous = makeSections({ recallNotes: ["Note A"] });
		const current = makeSections({ recallNotes: ["Note A", "Note B"] });
		const merged = mergeWithPreviousVcc(previous, current);
		expect(merged.recallNotes).toEqual(["Note A", "Note B"]);
	});
});

describe("injectRecallNote", () => {
	it("adds a new note", () => {
		const sections = makeSections();
		const result = injectRecallNote(sections, "Important");
		expect(result.recallNotes).toContain("Important");
	});

	it("does not duplicate existing notes", () => {
		const sections = makeSections({ recallNotes: ["Important"] });
		const result = injectRecallNote(sections, "Important");
		expect(result.recallNotes).toHaveLength(1);
	});
});
