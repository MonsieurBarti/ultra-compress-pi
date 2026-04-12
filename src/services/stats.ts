import type { Level } from "../types.js";

const FACTORS: Record<Level, number> = {
	off: 1,
	lite: 0.85,
	standard: 0.65,
	ultra: 0.5,
	symbolic: 0.4,
};

export function levelFactor(level: Level): number {
	return FACTORS[level];
}

export function estimateCharsSaved(actualChars: number, level: Level): number {
	if (level === "off") return 0;
	const factor = FACTORS[level];
	const baseline = actualChars / factor;
	return Math.max(0, Math.round(baseline - actualChars));
}
