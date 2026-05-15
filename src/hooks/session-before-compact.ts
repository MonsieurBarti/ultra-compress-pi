import { mergeWithPrevious, parsePreviousSummary } from "../services/bounded-merge.js";
import { extractSections, formatSummary } from "../services/compaction-engine.js";
import { mergeWithPreviousVcc } from "../services/merge-vcc-previous.js";
import { parsePreviousSummaryVcc } from "../services/parse-vcc-summary.js";
import { normalizeAgentMessages } from "../services/session-normalizer.js";
import { extractVccSections, formatVccSummary } from "../services/vcc-compaction-engine.js";
import type {
	CompactionPreparation,
	EnhanceGoalFn,
	SessionBeforeCompactResult,
	SessionCompactConfig,
} from "../types/session-compact.js";

export type SessionBeforeCompactHook = (
	preparation: CompactionPreparation,
) => Promise<SessionBeforeCompactResult | undefined>;

export interface SessionBeforeCompactDeps {
	loadConfig: (projectRoot?: string) => Promise<SessionCompactConfig>;
	projectRoot?: string;
	enhanceGoal?: EnhanceGoalFn;
}

export function createSessionBeforeCompactHook(
	deps: SessionBeforeCompactDeps,
): SessionBeforeCompactHook {
	return async function onSessionBeforeCompact(
		preparation,
	): Promise<SessionBeforeCompactResult | undefined> {
		const config = await deps.loadConfig(deps.projectRoot);
		if (!config.overrideDefaultCompaction) {
			return undefined;
		}

		// VCC branch
		if (config.useVccPipeline) {
			const messages = normalizeAgentMessages(preparation.messagesToSummarize);
			const currentSections = extractVccSections(messages);

			let summarySections = currentSections;
			if (preparation.previousSummary) {
				const previousSections = parsePreviousSummaryVcc(preparation.previousSummary);
				summarySections = mergeWithPreviousVcc(previousSections, currentSections);
			}

			return {
				compaction: {
					summary: formatVccSummary(summarySections),
					firstKeptEntryId: preparation.firstKeptEntryId,
					tokensBefore: preparation.tokensBefore,
					details: { algorithmic: true, vcc: true },
				},
			};
		}

		// Legacy branch
		const messages = normalizeAgentMessages(preparation.messagesToSummarize);
		const currentSections = await extractSections(messages, {
			enhanceGoal: config.useLLMForGoal ? deps.enhanceGoal : undefined,
		});

		let summarySections = currentSections;
		if (preparation.previousSummary) {
			const previousSections = parsePreviousSummary(preparation.previousSummary);
			summarySections = mergeWithPrevious(previousSections, currentSections);
		}

		return {
			compaction: {
				summary: formatSummary(summarySections),
				firstKeptEntryId: preparation.firstKeptEntryId,
				tokensBefore: preparation.tokensBefore,
				details: { algorithmic: true },
			},
		};
	};
}
