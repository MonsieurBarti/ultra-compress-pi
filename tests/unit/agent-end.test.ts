import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentEndHook } from "../../src/hooks/agent-end";
import { loadState, saveLevel, setProjectRootForTest } from "../../src/services/state-store";

describe("agent_end hook", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-ae-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("is a no-op when level is off", async () => {
		const hook = createAgentEndHook();
		await hook({ content: "hello world", stopReason: "end_turn" }, { cwd: dir });
		const state = await loadState();
		expect(state.session.estimatedOutputCharsSaved).toBe(0);
	});

	it("increments chars saved when level is active and event carries content", async () => {
		await saveLevel("ultra");
		const hook = createAgentEndHook();
		await hook({ content: "a".repeat(500), stopReason: "end_turn" }, { cwd: dir });
		const state = await loadState();
		// ultra factor = 0.5, so baseline ≈ 1000, saved ≈ 500
		expect(state.session.estimatedOutputCharsSaved).toBeGreaterThan(400);
		expect(state.session.estimatedOutputCharsSaved).toBeLessThan(600);
	});

	it("extracts text from content when it's an array of parts", async () => {
		await saveLevel("standard");
		const hook = createAgentEndHook();
		await hook(
			{
				content: [
					{ type: "text", text: "hello " },
					{ type: "text", text: "world" },
				],
				stopReason: "end_turn",
			},
			{ cwd: dir },
		);
		const state = await loadState();
		// 11 chars of output at standard (factor 0.65): baseline ≈ 17, saved ≈ 6
		expect(state.session.estimatedOutputCharsSaved).toBeGreaterThan(0);
	});

	it("silently skips when event has no extractable content", async () => {
		await saveLevel("ultra");
		const hook = createAgentEndHook();
		await hook({ stopReason: "end_turn" }, { cwd: dir });
		const state = await loadState();
		expect(state.session.estimatedOutputCharsSaved).toBe(0);
	});
});
