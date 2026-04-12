import { describe, expect, it } from "vitest";
import {
	applyLevelLexical,
	maskProtectedZones,
	unmaskProtectedZones,
} from "../../src/services/level-rules.js";

describe("maskProtectedZones", () => {
	it("masks fenced code blocks with stable tokens", () => {
		const input = "prose\n\n```ts\nconst x = 1;\n```\n\nmore prose";
		const { masked, tokens } = maskProtectedZones(input);
		expect(masked).not.toContain("const x = 1");
		expect(masked).toMatch(/⟨PROT:0⟩/);
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toContain("const x = 1");
	});

	it("masks inline code, URLs, and file paths", () => {
		const input = "use `foo()` from https://example.com in src/index.ts";
		const { masked, tokens } = maskProtectedZones(input);
		expect(masked).not.toContain("foo()");
		expect(masked).not.toContain("https://example.com");
		expect(tokens.length).toBeGreaterThanOrEqual(3);
	});

	it("unmaskProtectedZones restores all tokens verbatim", () => {
		const input = "a `b` c https://x.com d src/e.ts f";
		const { masked, tokens } = maskProtectedZones(input);
		expect(unmaskProtectedZones(masked, tokens)).toBe(input);
	});
});

describe("applyLevelLexical/lite", () => {
	it("drops filler words", () => {
		const out = applyLevelLexical("This is just a really simple example.", "lite");
		expect(out).not.toMatch(/\bjust\b|\breally\b/);
	});

	it("drops hedging phrases", () => {
		const out = applyLevelLexical("It might be worth considering this.", "lite");
		expect(out.toLowerCase()).not.toContain("might be worth");
	});

	it("preserves articles at lite", () => {
		const out = applyLevelLexical("The quick brown fox.", "lite");
		expect(out).toContain("The");
	});
});

describe("applyLevelLexical/standard", () => {
	it("drops articles", () => {
		const out = applyLevelLexical("The quick brown fox jumps.", "standard");
		expect(out).not.toMatch(/\bthe\b/i);
	});

	it("substitutes utilize→use", () => {
		const out = applyLevelLexical("Utilize this to solve the problem.", "standard");
		expect(out.toLowerCase()).not.toContain("utilize");
		expect(out.toLowerCase()).toContain("use");
	});

	it("substitutes 'in order to'→'to'", () => {
		const out = applyLevelLexical("We do X in order to achieve Y.", "standard");
		expect(out.toLowerCase()).not.toContain("in order to");
	});
});

describe("applyLevelLexical/ultra", () => {
	it("abbreviates common technical words", () => {
		const out = applyLevelLexical("The database and authentication config.", "ultra");
		expect(out).toMatch(/\bDB\b/);
		expect(out).toMatch(/\bauth\b/);
	});
});

describe("applyLevelLexical/symbolic", () => {
	it("inherits ultra abbreviations", () => {
		const out = applyLevelLexical("Check the authentication.", "symbolic");
		expect(out).toMatch(/\bauth\b/);
	});
});
