import { describe, expect, it } from "vitest";
import { extractGoal } from "../../src/services/extract/goals.js";
import { makeScopeChangeSession, makeUserMessage } from "../fixtures/vcc-sessions.js";

describe("extractGoal", () => {
	it("extracts goal with task verb", () => {
		const messages = [makeUserMessage("Implement user authentication")];
		const goal = extractGoal(messages);
		expect(goal).toContain("Implement");
		expect(goal).toContain("authentication");
	});

	it("detects scope-change signals", () => {
		const messages = makeScopeChangeSession();
		const goal = extractGoal(messages);
		expect(goal).toContain("[Scope change]");
		expect(goal).toContain("Vue");
		expect(goal).toContain("Svelte");
	});

	it("filters noise patterns", () => {
		const messages = [
			makeUserMessage("TODO: implement auth"),
			makeUserMessage("Build the login page"),
		];
		const goal = extractGoal(messages);
		expect(goal).not.toContain("TODO");
		expect(goal).toContain("Build");
	});

	it("truncates templates", () => {
		const messages = [makeUserMessage("Implement {{userName}} authentication for {{project}}")];
		const goal = extractGoal(messages);
		expect(goal).not.toContain("{{");
		expect(goal).toContain("...");
	});

	it("deduplicates identical goals", () => {
		const messages = [
			makeUserMessage("Fix the bug in auth"),
			makeUserMessage("Fix the bug in auth"),
		];
		const goal = extractGoal(messages);
		const lines = goal.split("\n").filter((l) => l.trim());
		expect(lines.length).toBe(1);
	});

	it("returns first user message when no task verb found", () => {
		const messages = [makeUserMessage("What is the best approach?")];
		const goal = extractGoal(messages);
		expect(goal).toContain("best approach");
	});

	it("returns 'No active goal' for empty input", () => {
		expect(extractGoal([])).toBe("No active goal");
	});

	it("respects maxLength option", () => {
		const long = "Implement ".repeat(50);
		const messages = [makeUserMessage(long)];
		const goal = extractGoal(messages, { maxLength: 30 });
		expect(goal.length).toBeLessThanOrEqual(33); // 30 + "..."
	});
});
