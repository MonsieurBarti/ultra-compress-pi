import { describe, expect, it } from "vitest";
import {
	type VccSemanticSections,
	formatVccSummary,
} from "../../src/services/format-vcc-summary.js";
import { parsePreviousSummaryVcc } from "../../src/services/parse-vcc-summary.js";

describe("parsePreviousSummaryVcc", () => {
	it("parses full VCC summary", () => {
		const summary = `[Goal]
Implement auth

[Files & Changes]
read: src/auth.ts
modified: src/main.ts

[Commits]
- feat: add auth

[Outstanding Context]
- Need tests

[User Preferences]
- Use JWT

[VCC Brief]
[user] Implement auth
[assistant] I'll check

[RECALL_NOTE]
- Important decision made`;

		const result = parsePreviousSummaryVcc(summary);
		expect(result.goal).toBe("Implement auth");
		expect(result.files.read).toContain("src/auth.ts");
		expect(result.files.modified).toContain("src/main.ts");
		expect(result.commits).toContain("feat: add auth");
		expect(result.outstandingContext).toContain("Need tests");
		expect(result.userPreferences).toContain("Use JWT");
		expect(result.brief.length).toBeGreaterThan(0);
		expect(result.recallNotes).toContain("Important decision made");
	});

	it("handles empty summary", () => {
		const result = parsePreviousSummaryVcc("");
		expect(result.goal).toBe("");
		expect(result.files.read).toHaveLength(0);
	});

	it("parses old-style bullet list files as read", () => {
		const summary = `[Files & Changes]
- src/old.ts
- src/legacy.ts`;
		const result = parsePreviousSummaryVcc(summary);
		expect(result.files.read).toContain("src/old.ts");
		expect(result.files.read).toContain("src/legacy.ts");
	});

	it("ignores None lines", () => {
		const summary = `[Goal]
None

[Files & Changes]
None`;
		const result = parsePreviousSummaryVcc(summary);
		expect(result.goal).toBe("");
		expect(result.files.read).toHaveLength(0);
	});

	it("round-trips with formatVccSummary", () => {
		const original: VccSemanticSections = {
			goal: "Test goal",
			files: { read: ["a.ts"], modified: [], created: [] },
			commits: [],
			outstandingContext: [],
			userPreferences: [],
			brief: [],
		};
		const formatted = formatVccSummary(original);
		const parsed = parsePreviousSummaryVcc(formatted);
		expect(parsed.goal).toBe("Test goal");
		expect(parsed.files.read).toContain("a.ts");
	});
});
