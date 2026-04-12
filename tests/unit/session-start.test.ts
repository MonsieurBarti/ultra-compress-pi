import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionStartHook } from "../../src/hooks/session-start";
import { saveLevel, setProjectRootForTest } from "../../src/services/state-store";

describe("session_start hook", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-ss-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("notifies active level when level !== off", async () => {
		await saveLevel("ultra");
		const notify = vi.fn();
		const hook = createSessionStartHook({ notify });
		await hook({ reason: "startup" }, { cwd: dir });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("ultra"), "info");
	});

	it("is silent when level is off", async () => {
		const notify = vi.fn();
		const hook = createSessionStartHook({ notify });
		await hook({ reason: "startup" }, { cwd: dir });
		expect(notify).not.toHaveBeenCalled();
	});

	it("resets session stats on every start", async () => {
		await saveLevel("standard");
		const notify = vi.fn();
		const hook = createSessionStartHook({ notify });
		await hook({ reason: "startup" }, { cwd: dir });
		const { loadState } = await import("../../src/services/state-store");
		const state = await loadState();
		expect(state.session.autoClarityCount).toBe(0);
		expect(state.session.estimatedOutputCharsSaved).toBe(0);
	});
});
