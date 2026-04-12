import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUcCommand } from "../../src/commands/uc.js";
import { loadState, setProjectRootForTest } from "../../src/services/state-store.js";

describe("/uc command", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-cmd-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("writes level and notifies on valid input", async () => {
		const cmd = createUcCommand();
		const notify = vi.fn();
		await cmd.handler("ultra", { cwd: dir, ui: { notify } });
		const state = await loadState(dir);
		expect(state.level).toBe("ultra");
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("ultra"), "info");
	});

	it("rejects an invalid level with an error notification", async () => {
		const cmd = createUcCommand();
		const notify = vi.fn();
		await cmd.handler("bogus", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("invalid"), "error");
		const state = await loadState(dir);
		expect(state.level).toBe("off");
	});

	it("autocompletes levels by prefix", () => {
		const cmd = createUcCommand();
		const items = cmd.getArgumentCompletions?.("u") ?? [];
		expect(items.map((i) => i.value)).toEqual(["ultra"]);
	});

	it("autocompletes all levels for empty prefix", () => {
		const cmd = createUcCommand();
		const items = cmd.getArgumentCompletions?.("") ?? [];
		expect(items.map((i) => i.value)).toEqual(["off", "lite", "standard", "ultra", "symbolic"]);
	});

	it("shows a usage hint and does not touch state when called with empty args", async () => {
		const cmd = createUcCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("usage:"), "error");
		const state = await loadState(dir);
		expect(state.level).toBe("off");
	});
});
