import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUcRevertCommand } from "../../src/commands/uc-revert";

describe("/uc-revert command", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-revert-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("restores compressed file from .original.md backup and deletes the backup", async () => {
		const p = join(dir, "doc.md");
		const b = `${p}.original.md`;
		writeFileSync(p, "compressed");
		writeFileSync(b, "original content");
		const cmd = createUcRevertCommand();
		const notify = vi.fn();
		await cmd.handler(p, { cwd: dir, ui: { notify } });
		expect(readFileSync(p, "utf8")).toBe("original content");
		expect(existsSync(b)).toBe(false);
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("restored"), "info");
	});

	it("errors when backup is missing", async () => {
		const p = join(dir, "missing.md");
		writeFileSync(p, "x");
		const cmd = createUcRevertCommand();
		const notify = vi.fn();
		await cmd.handler(p, { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("no backup"), "error");
	});

	it("rejects absolute paths outside cwd", async () => {
		const notify = vi.fn();
		const cmd = createUcRevertCommand();
		await cmd.handler("/etc/passwd", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringMatching(/escapes project root/i), "error");
	});

	it("rejects .. traversal", async () => {
		const notify = vi.fn();
		const cmd = createUcRevertCommand();
		await cmd.handler("../../../etc/passwd", { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringMatching(/escapes project root/i), "error");
	});

	it("rejects symlinks", async () => {
		const { symlinkSync, writeFileSync } = await import("node:fs");
		writeFileSync(join(dir, "target.md"), "x");
		symlinkSync(join(dir, "target.md"), join(dir, "link.md"));
		const notify = vi.fn();
		const cmd = createUcRevertCommand();
		await cmd.handler(join(dir, "link.md"), { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringMatching(/symlink/i), "error");
	});
});

describe("/uc-revert autocomplete", () => {
	it("completes only files with an adjacent .original.md backup", () => {
		const dir = mkdtempSync(join(tmpdir(), "uc-rev-"));
		try {
			// a.md has a backup → revertable
			writeFileSync(join(dir, "a.md"), "x");
			writeFileSync(join(dir, "a.md.original.md"), "orig");
			// b.md has no backup → not revertable
			writeFileSync(join(dir, "b.md"), "x");
			const cmd = createUcRevertCommand({ cwd: dir });
			const items = cmd.getArgumentCompletions?.("") ?? [];
			const values = items.map((i) => i.value);
			expect(values).toContain("a.md");
			expect(values).not.toContain("b.md");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("completes nested paths and surfaces subdirectories", () => {
		const dir = mkdtempSync(join(tmpdir(), "uc-rev-"));
		try {
			mkdirSync(join(dir, "skills"), { recursive: true });
			writeFileSync(join(dir, "skills", "SKILL.md"), "x");
			writeFileSync(join(dir, "skills", "SKILL.md.original.md"), "orig");
			const cmd = createUcRevertCommand({ cwd: dir });
			const a = cmd.getArgumentCompletions?.("sk") ?? [];
			expect(a.map((i) => i.value)).toContain("skills/");
			const b = cmd.getArgumentCompletions?.("skills/") ?? [];
			expect(b.map((i) => i.value)).toContain("skills/SKILL.md");
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
