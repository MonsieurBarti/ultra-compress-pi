import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	loadState,
	resetSessionStats,
	saveLevel,
	setProjectRootForTest,
} from "../../src/services/state-store.js";

describe("state-store", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-state-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("returns defaults when state file is missing", async () => {
		const state = await loadState();
		expect(state.level).toBe("off");
		expect(state.session.autoClarityCount).toBe(0);
		expect(state.session.filesCompressed).toEqual([]);
	});

	it("round-trips level through saveLevel + loadState", async () => {
		await saveLevel("ultra");
		const state = await loadState();
		expect(state.level).toBe("ultra");
	});

	it("resets session stats but preserves level", async () => {
		await saveLevel("standard");
		const reset = await resetSessionStats();
		expect(reset.level).toBe("standard");
		expect(reset.session.autoClarityCount).toBe(0);
		expect(reset.session.estimatedOutputCharsSaved).toBe(0);
		expect(reset.session.filesCompressed).toEqual([]);
	});

	it("writes state file atomically (temp + rename)", async () => {
		await saveLevel("ultra");
		const path = join(dir, ".pi", "ultra-compress.json");
		const contents = JSON.parse(readFileSync(path, "utf8"));
		expect(contents.level).toBe("ultra");
		// No stray tmp file left behind
		const piFiles = readdirSync(join(dir, ".pi"));
		expect(piFiles.filter((f) => f.includes(".tmp-"))).toHaveLength(0);
	});

	it("refuses to overwrite a symlinked state file", async () => {
		const piDir = join(dir, ".pi");
		mkdirSync(piDir, { recursive: true });
		const realTarget = join(dir, "external.json");
		writeFileSync(realTarget, "{}");
		const { symlinkSync } = await import("node:fs");
		symlinkSync(realTarget, join(piDir, "ultra-compress.json"));
		await expect(saveLevel("ultra")).rejects.toThrow(/symlink/);
	});

	it("recovers from corrupt JSON by backing up and returning defaults", async () => {
		const piDir = join(dir, ".pi");
		mkdirSync(piDir, { recursive: true });
		writeFileSync(join(piDir, "ultra-compress.json"), "{{not json}}");
		const state = await loadState();
		expect(state.level).toBe("off");
		const files = readdirSync(piDir);
		expect(files.some((f) => f.startsWith("ultra-compress.json.corrupt-"))).toBe(true);
	});
});
