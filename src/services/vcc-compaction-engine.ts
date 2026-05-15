import type { TranscriptMessage } from "../types/session-compact.js";
import { type BuildOwnCutOptions, buildOwnCut } from "./build-own-cut.js";
import {
	extractCommits,
	extractOutstandingContext,
	extractUserPreferences,
} from "./compaction-engine.js";
import { type BuildBriefOptions, buildBrief } from "./extract/brief.js";
import { extractFileActivity } from "./extract/files.js";
import { extractGoal } from "./extract/goals.js";
import { type FilterNoiseOptions, filterNoise } from "./filter-noise.js";
import { type VccSemanticSections, capBrief, formatVccSummary } from "./format-vcc-summary.js";
export { formatVccSummary } from "./format-vcc-summary.js";

export interface CompactSessionVccOptions {
	filterNoise?: FilterNoiseOptions;
	buildOwnCut?: BuildOwnCutOptions;
	buildBrief?: BuildBriefOptions;
	capBriefMaxLines?: number;
	fileOps?: { operations?: unknown[] };
}

export function extractVccSections(
	messages: TranscriptMessage[],
	opts: CompactSessionVccOptions = {},
): VccSemanticSections {
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

	return {
		goal,
		files,
		commits,
		outstandingContext,
		userPreferences,
		brief: cappedBrief,
	};
}

export function compactSessionVcc(
	messages: TranscriptMessage[],
	opts: CompactSessionVccOptions = {},
): string {
	return formatVccSummary(extractVccSections(messages, opts));
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

	// Count words iteratively to avoid allocating a giant intermediate string
	let rawWords = 0;
	for (const msg of messages) {
		rawWords += countWords(msg.content);
	}
	const summaryWords = countWords(summary);
	const reductionPercent =
		rawWords > 0 ? Math.max(0, Math.round(((rawWords - summaryWords) / rawWords) * 100)) : 0;

	return { rawWords, summaryWords, reductionPercent };
}
