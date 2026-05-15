import { describe, expect, it } from "vitest";
import { searchSessionEntries } from "../../src/services/recall-engine.js";
import { rankResultsBM25, searchSessionEntriesBM25 } from "../../src/services/vcc-bm25.js";
import type { SessionEntry } from "../../src/types/session-compact.js";

function makeEntries(): SessionEntry[] {
	return [
		{ id: "1", type: "user", content: "how do I configure auth tokens" },
		{ id: "2", type: "assistant", content: "you can set them in .env.local" },
		{ id: "3", type: "user", content: "what about refresh tokens" },
		{ id: "4", type: "tool_call", content: "readFile .env.example" },
		{ id: "5", type: "user", content: "build is failing with eslint error" },
	];
}

describe("vcc-bm25", () => {
	it("finds entries matching a single word", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "auth");
		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0]?.matchedTerms).toContain("auth");
	});

	it("finds entries matching multi-word OR query", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "auth token");
		expect(matches.length).toBeGreaterThanOrEqual(2);
	});

	it("supports regex search", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "refresh.*token");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	it("ranks results by BM25 score descending", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "token");
		for (let i = 1; i < matches.length; i++) {
			expect(matches[i - 1]?.score ?? 0).toBeGreaterThanOrEqual(matches[i]?.score ?? 0);
		}
	});

	it("returns empty for no-match", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "xyz-nonexistent");
		expect(matches).toHaveLength(0);
	});

	it("gracefully handles invalid regex", () => {
		const matches = searchSessionEntriesBM25(makeEntries(), "[invalid(regex");
		expect(matches).toEqual([]);
	});

	it("shows IDF effect — rarer terms score higher", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "user", content: "common common common" },
			{ id: "2", type: "user", content: "common rare" },
			{ id: "3", type: "user", content: "common rare rare" },
		];
		const matches = searchSessionEntriesBM25(entries, "common rare");
		const rareHeavy = matches.find((m) => m.entry.id === "3");
		const commonOnly = matches.find((m) => m.entry.id === "1");
		expect(rareHeavy).toBeDefined();
		expect(commonOnly).toBeDefined();
		expect(rareHeavy?.score ?? 0).toBeGreaterThan(commonOnly?.score ?? 0);
	});

	it("rankResultsBM25 re-ranks with BM25 scores", () => {
		const entries = makeEntries();
		const matches = searchSessionEntriesBM25(entries, "token");
		const shuffled = [...matches].sort(() => Math.random() - 0.5);
		const ranked = rankResultsBM25(shuffled, "token");
		for (let i = 1; i < ranked.length; i++) {
			expect(ranked[i - 1]?.score ?? 0).toBeGreaterThanOrEqual(ranked[i]?.score ?? 0);
		}
	});

	it("parity: simple word query finds same entries as recall-engine", () => {
		const entries = makeEntries();
		const bm25 = searchSessionEntriesBM25(entries, "auth");
		const base = searchSessionEntries(entries, "auth");
		const bm25Ids = new Set(bm25.map((m) => m.entry.id));
		const baseIds = new Set(base.map((m) => m.entry.id));
		expect(bm25Ids).toEqual(baseIds);
	});

	it("parity: multi-word query finds same entries as recall-engine", () => {
		const entries = makeEntries();
		const bm25 = searchSessionEntriesBM25(entries, "auth token");
		const base = searchSessionEntries(entries, "auth token");
		const bm25Ids = new Set(bm25.map((m) => m.entry.id));
		const baseIds = new Set(base.map((m) => m.entry.id));
		expect(bm25Ids).toEqual(baseIds);
	});

	it("parity: regex query finds same entries as recall-engine", () => {
		const entries = makeEntries();
		const bm25 = searchSessionEntriesBM25(entries, "refresh.*token");
		const base = searchSessionEntries(entries, "refresh.*token");
		const bm25Ids = new Set(bm25.map((m) => m.entry.id));
		const baseIds = new Set(base.map((m) => m.entry.id));
		expect(bm25Ids).toEqual(baseIds);
	});
});
