import { describe, expect, it } from "vitest";
import { buildLevelPromptFragment } from "../../src/services/level-prompts.js";

describe("buildLevelPromptFragment", () => {
	it("produces distinct fragments per level for runtime mode", () => {
		const lite = buildLevelPromptFragment("lite", "runtime");
		const ultra = buildLevelPromptFragment("ultra", "runtime");
		const symbolic = buildLevelPromptFragment("symbolic", "runtime");
		expect(lite).not.toEqual(ultra);
		expect(ultra).not.toEqual(symbolic);
	});

	it("runtime fragments mention Auto-Clarity override", () => {
		const out = buildLevelPromptFragment("ultra", "runtime");
		expect(out.toLowerCase()).toContain("auto-clarity");
	});

	it("file-mode symbolic fragment mentions Greek vars and logical operators", () => {
		const out = buildLevelPromptFragment("symbolic", "file");
		expect(out).toMatch(/Greek|∀|∃|→/);
	});

	it("all fragments mention the active level name", () => {
		for (const level of ["lite", "standard", "ultra", "symbolic"] as const) {
			const runtime = buildLevelPromptFragment(level, "runtime");
			const file = buildLevelPromptFragment(level, "file");
			expect(runtime.toLowerCase()).toContain(level);
			expect(file.toLowerCase()).toContain(level);
		}
	});
});
