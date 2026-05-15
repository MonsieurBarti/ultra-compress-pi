import type { RecallMatch, SessionEntry } from "../types/session-compact.js";

const K = 1.2;
const B = 0.75;

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9_/.-]+/)
		.filter((t) => t.length > 1);
}

function isRegexPattern(query: string): boolean {
	return /[.*+?^${}()|[\]\\]/.test(query);
}

function entryToText(entry: SessionEntry): string {
	return JSON.stringify(entry).toLowerCase();
}

function computeIdf(N: number, df: number): number {
	return Math.log((N - df + 0.5) / (df + 0.5) + 1);
}

interface DocStats {
	tokens: string[];
	tokenSet: Set<string>;
	length: number;
}

function buildCorpusStats(entries: SessionEntry[]): {
	docs: DocStats[];
	avgDocLen: number;
	df: Map<string, number>;
	N: number;
} {
	const docs: DocStats[] = [];
	const df = new Map<string, number>();
	let totalLen = 0;

	for (const entry of entries) {
		const tokens = tokenize(entryToText(entry));
		const tokenSet = new Set(tokens);
		const length = tokens.length;

		docs.push({ tokens, tokenSet, length });
		totalLen += length;

		for (const token of tokenSet) {
			df.set(token, (df.get(token) ?? 0) + 1);
		}
	}

	const N = entries.length;
	const avgDocLen = N > 0 ? totalLen / N : 0;
	return { docs, avgDocLen, df, N };
}

function computeBM25Score(
	queryTerms: string[],
	doc: DocStats,
	avgDocLen: number,
	df: Map<string, number>,
	N: number,
): { score: number; matchedTerms: string[] } {
	let score = 0;
	const matchedTerms: string[] = [];

	for (const term of queryTerms) {
		if (!doc.tokenSet.has(term)) continue;
		if (!matchedTerms.includes(term)) matchedTerms.push(term);

		const tf = doc.tokens.filter((t) => t === term).length;
		const idf = computeIdf(N, df.get(term) ?? 0);
		const docLenNorm = 1 - B + B * (doc.length / avgDocLen);
		score += idf * ((tf * (K + 1)) / (tf + K * docLenNorm));
	}

	return { score, matchedTerms };
}

export function searchSessionEntriesBM25(entries: SessionEntry[], query: string): RecallMatch[] {
	if (!query.trim()) return [];

	if (isRegexPattern(query)) {
		try {
			const re = new RegExp(query, "i");
			const matches: RecallMatch[] = [];
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				if (!entry) continue;
				if (re.test(entryToText(entry))) {
					matches.push({
						index: i,
						entry,
						score: 0,
						matchedTerms: [query],
					});
				}
			}
			return matches;
		} catch {
			return [];
		}
	}

	const queryTerms = tokenize(query);
	if (queryTerms.length === 0) return [];

	const { docs, avgDocLen, df, N } = buildCorpusStats(entries);
	const matches: RecallMatch[] = [];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		const text = entryToText(entry);
		const doc = docs[i];
		if (!doc) continue;

		const matchedTerms: string[] = [];
		for (const term of queryTerms) {
			if (text.includes(term)) matchedTerms.push(term);
		}
		if (matchedTerms.length === 0) continue;

		const { score } = computeBM25Score(queryTerms, doc, avgDocLen, df, N);
		matches.push({ index: i, entry, score, matchedTerms });
	}

	return matches.sort((a, b) => b.score - a.score);
}

export function rankResultsBM25(matches: RecallMatch[], query: string): RecallMatch[] {
	if (matches.length === 0) return [];
	if (!query.trim()) return matches;

	if (isRegexPattern(query)) {
		return [...matches].sort((a, b) => b.score - a.score);
	}

	const queryTerms = tokenize(query);
	if (queryTerms.length === 0) return matches;

	const entries = matches.map((m) => m.entry);
	const { docs, avgDocLen, df, N } = buildCorpusStats(entries);

	const scored = matches.map((m, i) => {
		const doc = docs[i];
		if (!doc) return m;
		const text = entryToText(m.entry);
		const matchedTerms: string[] = [];
		for (const term of queryTerms) {
			if (text.includes(term)) matchedTerms.push(term);
		}
		const { score } = computeBM25Score(queryTerms, doc, avgDocLen, df, N);
		return { ...m, score, matchedTerms };
	});

	return scored.sort((a, b) => b.score - a.score);
}
