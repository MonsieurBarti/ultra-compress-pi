import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUcStatusCommand } from "../../src/commands/uc-status.js";
import {
	appendCompressedFile,
	saveLevel,
	setProjectRootForTest,
} from "../../src/services/state-store.js";

describe("/uc-status command", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-status-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("reports the active level and defaults for a fresh project", async () => {
		const cmd = createUcStatusCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("off"), "info");
	});

	it("reports level, chars saved, and last files compressed", async () => {
		await saveLevel("ultra");
		await appendCompressedFile(
			{
				path: "/p/skills/a.md",
				level: "ultra",
				before: 1000,
				after: 400,
				at: new Date().toISOString(),
			},
			dir,
		);
		const cmd = createUcStatusCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("ultra"), "info");
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("a.md"), "info");
	});
});
