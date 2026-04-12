import { type ActiveLevel, type CompressResult, type Mode, ValidatorFailedError } from "../types";
import { buildLevelPromptFragment } from "./level-prompts";
import { applyLevelLexical, maskProtectedZones, unmaskProtectedZones } from "./level-rules";
import { validateCompression } from "./validator";

export type LLMCall = (prompt: string, signal?: AbortSignal) => Promise<string>;

export interface CompressPipelineInput {
	input: string;
	level: ActiveLevel;
	mode: Mode;
	llm: LLMCall;
	maxRepairRetries?: number;
	signal?: AbortSignal;
}

const OUTER_FENCE_RE = /^\s*```(?:\w+)?\n([\s\S]*?)\n```\s*$/;

function stripOuterFence(s: string): string {
	const m = s.match(OUTER_FENCE_RE);
	return m ? m[1]! : s;
}

function buildInitialPrompt(maskedPrePass: string, level: ActiveLevel, mode: Mode): string {
	const rules = buildLevelPromptFragment(level, mode);
	return `${rules}\n\nInput to compress:\n\n${maskedPrePass}`;
}

function buildRepairPrompt(
	masked: string,
	previousOutput: string,
	errors: string[],
	level: ActiveLevel,
	mode: Mode,
): string {
	return `${buildLevelPromptFragment(level, mode)}

Previous output had these specific errors. DO NOT recompress or rephrase — PATCH ONLY these drifts:

${errors.map((e) => `- ${e}`).join("\n")}

Original masked input:
${masked}

Previous attempt:
${previousOutput}

Return a corrected version that keeps the level-${level} compression but fixes the listed drifts.`;
}

export async function compressTextPipeline(opts: CompressPipelineInput): Promise<CompressResult> {
	const { input, level, mode, llm, maxRepairRetries = 2, signal } = opts;

	const { masked, tokens } = maskProtectedZones(input);
	const lexical = applyLevelLexical(masked, level);

	const prompt = buildInitialPrompt(lexical, level, mode);

	let attempt = 0;
	let lastOutput = "";
	let lastErrors: string[] = [];
	const warnings: string[] = [];

	while (attempt <= maxRepairRetries) {
		const raw =
			attempt === 0
				? await llm(prompt, signal)
				: await llm(buildRepairPrompt(lexical, lastOutput, lastErrors, level, mode), signal);

		let stripped = stripOuterFence(raw.trim());
		// Remove punctuation immediately after protected token references to avoid duplication
		stripped = stripped.replace(/⟨PROT:\d+⟩[.,;:!?]/g, (match) => match.slice(0, -1));
		lastOutput = stripped;

		const unmasked = unmaskProtectedZones(stripped, tokens);
		const report = validateCompression(input, unmasked);

		if (report.ok) {
			return {
				compressed: unmasked,
				before: input.length,
				after: unmasked.length,
				ratio: (input.length - unmasked.length) / input.length,
				warnings: [...warnings, ...report.warnings],
			};
		}

		lastErrors = report.errors;
		attempt += 1;
	}

	throw new ValidatorFailedError(lastErrors);
}
