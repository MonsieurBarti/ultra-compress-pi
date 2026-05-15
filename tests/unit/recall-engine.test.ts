import { describe, expect, it } from "vitest";
import {
	expandEntry,
	paginateResults,
	rankResults,
	searchSessionEntries,
} from "../../src/services/recall-engine.js";
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

describe("recall-engine", () => {
	it("finds entries matching a single word", () => {
		const matches = searchSessionEntries(makeEntries(), "auth");
		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0]?.matchedTerms).toContain("auth");
	});

	it("finds entries matching multi-word OR query", () => {
		const matches = searchSessionEntries(makeEntries(), "auth token");
		expect(matches.length).toBeGreaterThanOrEqual(2);
	});

	it("supports regex search", () => {
		const matches = searchSessionEntries(makeEntries(), "refresh.*token");
		expect(matches.length).toBeGreaterThanOrEqual(1);
	});

	it("ranks results by relevance", () => {
		const matches = searchSessionEntries(makeEntries(), "token");
		const ranked = rankResults(matches, "token");
		expect(ranked[0]?.score).toBeGreaterThanOrEqual(ranked[1]?.score ?? 0);
	});

	it("paginates results (5 per page)", () => {
		const matches = searchSessionEntries(makeEntries(), "token");
		const paged = paginateResults(matches, 1, 5);
		expect(paged.matches.length).toBeLessThanOrEqual(5);
		expect(paged.page).toBe(1);
	});

	it("expandEntry returns full untruncated entry", () => {
		const entry = makeEntries()[0]!;
		const expanded = expandEntry(entry);
		expect(expanded).toEqual(entry);
	});

	it("returns empty results for no-match query", () => {
		const matches = searchSessionEntries(makeEntries(), "xyz-nonexistent");
		expect(matches).toHaveLength(0);
	});

	it("falls back gracefully for invalid regex", () => {
		const entries = makeEntries();
		const matches = searchSessionEntries(entries, "[invalid(regex");
		expect(matches).toEqual([]);
	});
});
