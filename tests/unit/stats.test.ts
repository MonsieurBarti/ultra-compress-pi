import { describe, expect, it } from "vitest";
import { estimateCharsSaved, levelFactor } from "../../src/services/stats";

describe("stats/levelFactor", () => {
	it("returns expected ratios per level", () => {
		expect(levelFactor("off")).toBe(1);
		expect(levelFactor("lite")).toBeCloseTo(0.85);
		expect(levelFactor("standard")).toBeCloseTo(0.65);
		expect(levelFactor("ultra")).toBeCloseTo(0.5);
		expect(levelFactor("symbolic")).toBeCloseTo(0.4);
	});
});

describe("stats/estimateCharsSaved", () => {
	it("computes chars saved vs. baseline for a given output + level", () => {
		const saved = estimateCharsSaved(1000, "ultra");
		expect(saved).toBeCloseTo(1000, 0);
	});

	it("returns 0 when level is off", () => {
		expect(estimateCharsSaved(1000, "off")).toBe(0);
	});
});
