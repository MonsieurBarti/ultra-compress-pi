import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBeforeAgentStartHook } from "../../src/hooks/before-agent-start.js";
import { saveLevel, setProjectRootForTest } from "../../src/services/state-store.js";

describe("before_agent_start hook", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-bas-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("returns undefined when level is off", async () => {
		const hook = createBeforeAgentStartHook();
		const result = await hook({ prompt: "hello", systemPrompt: "base" }, { cwd: dir });
		expect(result).toBeUndefined();
	});

	it("augments systemPrompt with a level marker when level is active", async () => {
		await saveLevel("ultra");
		const hook = createBeforeAgentStartHook();
		const result = await hook({ prompt: "hello", systemPrompt: "base" }, { cwd: dir });
		expect(result).toBeDefined();
		expect(result?.systemPrompt).toContain("base");
		expect(result?.systemPrompt).toContain("ultra-compress");
		expect(result?.systemPrompt).toMatch(/LEVEL\s*=\s*ultra/i);
		expect(result?.systemPrompt).toMatch(/auto-clarity/i);
	});

	it("does not return a message entry (history stays clean)", async () => {
		await saveLevel("lite");
		const hook = createBeforeAgentStartHook();
		const result = await hook({ prompt: "hello", systemPrompt: "base" }, { cwd: dir });
		expect((result as { message?: unknown })?.message).toBeUndefined();
	});
});
