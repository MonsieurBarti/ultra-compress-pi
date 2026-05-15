import type { TranscriptMessage } from "../types/session-compact.js";
import { type BuildOwnCutOptions, buildOwnCut } from "./build-own-cut.js";
import { type BuildBriefOptions, buildBrief } from "./extract/brief.js";
import { extractFileActivity } from "./extract/files.js";
import { extractGoal } from "./extract/goals.js";
import { type FilterNoiseOptions, filterNoise } from "./filter-noise.js";
import { type VccSemanticSections, capBrief, formatVccSummary } from "./format-vcc-summary.js";

export interface CompactSessionVccOptions {
	filterNoise?: FilterNoiseOptions;
	buildOwnCut?: BuildOwnCutOptions;
	buildBrief?: BuildBriefOptions;
	capBriefMaxLines?: number;
	fileOps?: { operations?: unknown[] };
}

function extractCommits(messages: TranscriptMessage[]): string[] {
	const commits: string[] = [];
	for (const msg of messages) {
		const matches = msg.content.matchAll(/(?:commit|git commit|committed?)[\s:-]+(.+)/gi);
		for (const match of matches) {
			const text = match[1]?.trim();
			if (text) commits.push(text);
		}
	}
	return commits.slice(0, 10);
}

function extractOutstandingContext(messages: TranscriptMessage[]): string[] {
	const items: string[] = [];
	for (const msg of messages) {
		if (msg.role === "user" && /\?(?:\s|$)/.test(msg.content)) {
			const q = msg.content.trim();
			if (q.length < 200) items.push(q);
		}
		const todos = msg.content.matchAll(/(?:TODO|FIXME|HACK|BUG)(?:[:\s]+)(.+)/gi);
		for (const match of todos) {
			const todo = match[1]?.trim();
			if (todo) items.push(todo);
		}
	}
	return items.slice(0, 10);
}

function extractUserPreferences(messages: TranscriptMessage[]): string[] {
	const prefs: string[] = [];
	for (const msg of messages) {
		if (msg.role !== "user") continue;
		const sentences = msg.content.split(/[.!?]+/);
		for (const sentence of sentences) {
			const lower = sentence.toLowerCase();
			if (
				lower.includes("use ") ||
				lower.includes("prefer ") ||
				lower.includes("enable ") ||
				lower.includes("disable ") ||
				lower.includes("don't ") ||
				lower.includes("do not ") ||
				lower.includes("keep ") ||
				lower.includes("separate ")
			) {
				const trimmed = sentence.trim();
				if (trimmed.length > 5 && trimmed.length < 200) prefs.push(trimmed);
			}
		}
	}
	return prefs.slice(0, 10);
}

export function compactSessionVcc(
	messages: TranscriptMessage[],
	opts: CompactSessionVccOptions = {},
): string {
	// 1. Filter noise
	const filtered = filterNoise(messages, opts.filterNoise);

	// 2. Build own cut
	const { messagesToSummarize } = buildOwnCut(filtered, opts.buildOwnCut);

	// 3. Extract sections
	const goal = extractGoal(messagesToSummarize);
	const files = extractFileActivity(messagesToSummarize, opts.fileOps, { trimPrefix: true });
	const commits = extractCommits(messagesToSummarize);
	const outstandingContext = extractOutstandingContext(messagesToSummarize);
	const userPreferences = extractUserPreferences(messagesToSummarize);

	// 4. Build brief
	const briefLines = buildBrief(messagesToSummarize, opts.buildBrief);

	// 5. Cap brief
	const cappedBrief = capBrief(briefLines, opts.capBriefMaxLines ?? 120);

	// 6. Format
	const sections: VccSemanticSections = {
		goal,
		files,
		commits,
		outstandingContext,
		userPreferences,
		brief: cappedBrief,
	};

	return formatVccSummary(sections);
}

/** Estimates token reduction by comparing raw word count to summary word count */
export function estimateTokenReduction(
	messages: TranscriptMessage[],
	summary: string,
): { rawWords: number; summaryWords: number; reductionPercent: number } {
	const segmenter =
		typeof Intl !== "undefined" && Intl.Segmenter
			? new Intl.Segmenter("en", { granularity: "word" })
			: null;

	function countWords(text: string): number {
		if (segmenter) {
			let count = 0;
			for (const seg of segmenter.segment(text)) {
				if (seg.isWordLike) count++;
			}
			return count;
		}
		return text.split(/[^a-z0-9]+/i).filter((w) => w.length > 0).length;
	}

	const rawText = messages.map((m) => m.content).join(" ");
	const rawWords = countWords(rawText);
	const summaryWords = countWords(summary);
	const reductionPercent =
		rawWords > 0 ? Math.max(0, Math.round(((rawWords - summaryWords) / rawWords) * 100)) : 0;

	return { rawWords, summaryWords, reductionPercent };
}
