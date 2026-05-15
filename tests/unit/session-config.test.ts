import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ensureSessionCompactConfig,
	loadSessionCompactConfig,
	saveSessionCompactConfig,
	setSessionCompactConfigProjectRootForTest,
} from "../../src/services/session-config.js";

describe("session-config", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-session-config-"));
		setSessionCompactConfigProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("returns defaults when config file is missing", async () => {
		const cfg = await loadSessionCompactConfig();
		expect(cfg.overrideDefaultCompaction).toBe(false);
		expect(cfg.useLLMForGoal).toBe(false);
	});

	it("round-trips config through save + load", async () => {
		await saveSessionCompactConfig({
			overrideDefaultCompaction: true,
			useLLMForGoal: true,
			updatedAt: new Date().toISOString(),
		});
		const cfg = await loadSessionCompactConfig();
		expect(cfg.overrideDefaultCompaction).toBe(true);
		expect(cfg.useLLMForGoal).toBe(true);
	});

	it("auto-scaffolds defaults with ensureSessionCompactConfig", async () => {
		const cfg = await ensureSessionCompactConfig();
		expect(cfg.overrideDefaultCompaction).toBe(false);
		expect(cfg.useLLMForGoal).toBe(false);
		const path = join(dir, ".pi", "ultra-compress-session.json");
		expect(readFileSync(path, "utf8")).toContain("overrideDefaultCompaction");
	});

	it("ensureSessionCompactConfig returns existing config without overwriting", async () => {
		await saveSessionCompactConfig({
			overrideDefaultCompaction: true,
			useLLMForGoal: true,
			updatedAt: new Date().toISOString(),
		});
		const cfg = await ensureSessionCompactConfig();
		expect(cfg.overrideDefaultCompaction).toBe(true);
		expect(cfg.useLLMForGoal).toBe(true);
	});

	it("writes atomically (no stray tmp files)", async () => {
		await saveSessionCompactConfig({
			overrideDefaultCompaction: true,
			useLLMForGoal: false,
			updatedAt: new Date().toISOString(),
		});
		const piFiles = readdirSync(join(dir, ".pi"));
		expect(piFiles.filter((f) => f.includes(".tmp-"))).toHaveLength(0);
	});

	it("refuses to overwrite a symlinked config file", async () => {
		const piDir = join(dir, ".pi");
		mkdirSync(piDir, { recursive: true });
		const realTarget = join(dir, "external.json");
		writeFileSync(realTarget, "{}");
		const { symlinkSync } = await import("node:fs");
		symlinkSync(realTarget, join(piDir, "ultra-compress-session.json"));
		await expect(
			saveSessionCompactConfig({
				overrideDefaultCompaction: true,
				useLLMForGoal: false,
				updatedAt: new Date().toISOString(),
			}),
		).rejects.toThrow(/symlink/);
	});

	it("recovers from corrupt JSON by backing up and returning defaults", async () => {
		const piDir = join(dir, ".pi");
		mkdirSync(piDir, { recursive: true });
		writeFileSync(join(piDir, "ultra-compress-session.json"), "{{not json}}");
		const cfg = await loadSessionCompactConfig();
		expect(cfg.overrideDefaultCompaction).toBe(false);
		const files = readdirSync(piDir);
		expect(files.some((f) => f.startsWith("ultra-compress-session.json.corrupt-"))).toBe(true);
	});
});
