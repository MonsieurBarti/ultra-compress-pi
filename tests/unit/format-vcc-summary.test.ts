import { describe, expect, it } from "vitest";
import {
	type VccSemanticSections,
	capBrief,
	formatVccSummary,
} from "../../src/services/format-vcc-summary.js";

describe("capBrief", () => {
	it("returns all lines when under budget", () => {
		const lines = [{ role: "user", content: "a", turn: 1 }];
		expect(capBrief(lines, 5)).toHaveLength(1);
	});

	it("trims to max lines keeping tail", () => {
		const lines = Array.from({ length: 10 }, (_, i) => ({
			role: "user" as const,
			content: String(i),
			turn: i,
		}));
		const result = capBrief(lines, 5);
		expect(result).toHaveLength(5);
		expect(result[0]?.content).toBe("5");
		expect(result[4]?.content).toBe("9");
	});

	it("returns empty for empty input", () => {
		expect(capBrief([], 10)).toHaveLength(0);
	});
});

describe("formatVccSummary", () => {
	it("formats all sections", () => {
		const sections: VccSemanticSections = {
			goal: "Implement auth",
			files: { read: ["src/auth.ts"], modified: ["src/main.ts"], created: [] },
			commits: ["feat: add auth"],
			outstandingContext: ["Need tests"],
			userPreferences: ["Use JWT"],
			brief: [{ role: "user", content: "[user] Implement auth", turn: 1 }],
		};
		const result = formatVccSummary(sections);
		expect(result).toContain("[Goal]");
		expect(result).toContain("Implement auth");
		expect(result).toContain("[Files & Changes]");
		expect(result).toContain("read: src/auth.ts");
		expect(result).toContain("modified: src/main.ts");
		expect(result).toContain("[Commits]");
		expect(result).toContain("[Outstanding Context]");
		expect(result).toContain("[User Preferences]");
		expect(result).toContain("[VCC Brief]");
		expect(result).toContain("[user] Implement auth");
	});

	it("shows None for empty sections", () => {
		const sections: VccSemanticSections = {
			goal: "",
			files: { read: [], modified: [], created: [] },
			commits: [],
			outstandingContext: [],
			userPreferences: [],
			brief: [],
		};
		const result = formatVccSummary(sections);
		expect(result).toContain("No active goal");
		expect(result).toContain("None");
		expect(result).toContain("No entries");
	});

	it("handles scope-change goals with newlines", () => {
		const sections: VccSemanticSections = {
			goal: "Build X\n[Scope change] Use Y",
			files: { read: [], modified: [], created: [] },
			commits: [],
			outstandingContext: [],
			userPreferences: [],
			brief: [],
		};
		const result = formatVccSummary(sections);
		expect(result).toContain("Build X");
		expect(result).toContain("[Scope change] Use Y");
	});
});
