import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUcFileCommand } from "../../src/commands/uc-file";
import { setProjectRootForTest } from "../../src/services/state-store";

describe("/uc-file command", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-file-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("parses path + level + --yes and writes compressed file with backup", async () => {
		const filePath = join(dir, "doc.md");
		writeFileSync(filePath, "The quick brown fox.\n");
		const notify = vi.fn();
		const llm = vi.fn(async () => "Quick fox.");
		const cmd = createUcFileCommand({ llm: () => llm });
		await cmd.handler(`${filePath} standard --yes`, { cwd: dir, ui: { notify } });

		expect(existsSync(`${filePath}.original.md`)).toBe(true);
		expect(readFileSync(filePath, "utf8")).toBe("Quick fox.");
		expect(notify).toHaveBeenCalledWith(expect.stringMatching(/written|compressed/i), "info");
	});

	it("errors on invalid level", async () => {
		const filePath = join(dir, "doc.md");
		writeFileSync(filePath, "text");
		const notify = vi.fn();
		const cmd = createUcFileCommand({ llm: () => vi.fn() });
		await cmd.handler(`${filePath} bogus --yes`, { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("invalid"), "error");
	});

	it("errors when backup already exists", async () => {
		const filePath = join(dir, "doc.md");
		writeFileSync(filePath, "text");
		writeFileSync(`${filePath}.original.md`, "already");
		const notify = vi.fn();
		const cmd = createUcFileCommand({ llm: () => vi.fn(async () => "x") });
		await cmd.handler(`${filePath} standard --yes`, { cwd: dir, ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("backup"), "error");
	});

	it("completes path at position 1 and level at position 2", () => {
		writeFileSync(join(dir, "a.md"), "x");
		writeFileSync(join(dir, "b.md"), "x");
		const cmd = createUcFileCommand({ llm: () => vi.fn(), cwd: dir });
		const p1 = cmd.getArgumentCompletions?.("") ?? [];
		expect(p1.some((i) => i.value.endsWith("a.md"))).toBe(true);
		const p2 = cmd.getArgumentCompletions?.(`${join(dir, "a.md")} u`) ?? [];
		expect(p2.map((i) => i.value)).toEqual(["ultra"]);
	});
});
