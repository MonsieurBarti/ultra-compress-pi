import type { RecallMatch, RecallResult, SessionEntry } from "../types/session-compact.js";

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9_/.-]+/)
		.filter((t) => t.length > 1);
}

function isRegexPattern(query: string): boolean {
	return /[.*+?^${}()|[\]\\]/.test(query);
}

function matchesQuery(entry: SessionEntry, query: string): { matched: boolean; terms: string[] } {
	const text = JSON.stringify(entry).toLowerCase();
	const terms = tokenize(query);

	if (isRegexPattern(query)) {
		try {
			const re = new RegExp(query, "i");
			const matched = re.test(text);
			return { matched, terms: matched ? [query] : [] };
		} catch {
			return { matched: false, terms: [] };
		}
	}

	const matchedTerms: string[] = [];
	for (const term of terms) {
		if (text.includes(term)) matchedTerms.push(term);
	}
	return { matched: matchedTerms.length > 0, terms: matchedTerms };
}

function computeScore(match: RecallMatch, queryTerms: string[]): number {
	// Simple TF-IDF-like: rare terms get higher weight
	const rarityBonus = queryTerms.filter((t) => t.length > 4).length * 0.5;
	return match.matchedTerms.length + rarityBonus;
}

export function searchSessionEntries(entries: SessionEntry[], query: string): RecallMatch[] {
	const matches: RecallMatch[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		const { matched, terms } = matchesQuery(entry, query);
		if (matched) {
			matches.push({ index: i, entry, score: 0, matchedTerms: terms });
		}
	}
	return matches;
}

export function rankResults(matches: RecallMatch[], query: string): RecallMatch[] {
	const queryTerms = tokenize(query);
	const scored = matches.map((m) => ({
		...m,
		score: computeScore(m, queryTerms),
	}));
	return scored.sort((a, b) => b.score - a.score);
}

export function paginateResults(matches: RecallMatch[], page: number, pageSize = 5): RecallResult {
	const start = (page - 1) * pageSize;
	const end = start + pageSize;
	return {
		matches: matches.slice(start, end),
		total: matches.length,
		page,
		pageSize,
	};
}

export function expandEntry(entry: SessionEntry): SessionEntry {
	return entry;
}
