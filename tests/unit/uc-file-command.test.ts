import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUcFileCommand } from "../../src/commands/uc-file.js";

describe("/uc-file command", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-file-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("sends a preview prompt when --yes is absent", async () => {
		const p = join(dir, "doc.md");
		writeFileSync(p, "text");
		const sendUserMessage = vi.fn();
		const notify = vi.fn();
		const cmd = createUcFileCommand({ sendUserMessage });
		await cmd.handler(`${p} standard`, { cwd: dir, ui: { notify } });
		expect(sendUserMessage).toHaveBeenCalledTimes(1);
		const prompt = sendUserMessage.mock.calls[0]?.[0];
		expect(prompt).toMatch(/preview/i);
		expect(prompt).toContain(p);
		expect(prompt).toMatch(/level.*standard/i);
	});

	it("sends a write prompt when --yes is present", async () => {
		const p = join(dir, "doc.md");
		writeFileSync(p, "text");
		const sendUserMessage = vi.fn();
		const notify = vi.fn();
		const cmd = createUcFileCommand({ sendUserMessage });
		await cmd.handler(`${p} ultra --yes`, { cwd: dir, ui: { notify } });
		expect(sendUserMessage).toHaveBeenCalledTimes(1);
		const prompt = sendUserMessage.mock.calls[0]?.[0];
		expect(prompt).toMatch(/write/i);
		expect(prompt).toContain(`${p}.original.md`);
	});

	it("errors on invalid level without sending a message", async () => {
		const p = join(dir, "doc.md");
		writeFileSync(p, "text");
		const sendUserMessage = vi.fn();
		const notify = vi.fn();
		const cmd = createUcFileCommand({ sendUserMessage });
		await cmd.handler(`${p} bogus --yes`, { cwd: dir, ui: { notify } });
		expect(sendUserMessage).not.toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("invalid"), "error");
	});

	it("errors when backup already exists without sending a message", async () => {
		const p = join(dir, "doc.md");
		writeFileSync(p, "text");
		writeFileSync(`${p}.original.md`, "already");
		const sendUserMessage = vi.fn();
		const notify = vi.fn();
		const cmd = createUcFileCommand({ sendUserMessage });
		await cmd.handler(`${p} ultra --yes`, { cwd: dir, ui: { notify } });
		expect(sendUserMessage).not.toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("backup"), "error");
	});

	it("errors on path traversal without sending a message", async () => {
		const sendUserMessage = vi.fn();
		const notify = vi.fn();
		const cmd = createUcFileCommand({ sendUserMessage });
		await cmd.handler("/etc/passwd ultra --yes", { cwd: dir, ui: { notify } });
		expect(sendUserMessage).not.toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(expect.stringMatching(/escapes project root/i), "error");
	});

	describe("autocomplete", () => {
		it("completes path at position 1 and preserves it when completing level at position 2", () => {
			writeFileSync(join(dir, "a.md"), "x");
			writeFileSync(join(dir, "b.md"), "x");
			const cmd = createUcFileCommand({ sendUserMessage: vi.fn(), cwd: dir });

			const p1 = cmd.getArgumentCompletions?.("") ?? [];
			expect(p1.map((i) => i.value)).toEqual(expect.arrayContaining(["a.md", "b.md"]));

			const p2 = cmd.getArgumentCompletions?.("a.md u") ?? [];
			expect(p2.map((i) => i.value)).toEqual(["a.md ultra"]);
			expect(p2.map((i) => i.label)).toEqual(["ultra"]);

			const p3 = cmd.getArgumentCompletions?.("a.md ") ?? [];
			expect(p3.map((i) => i.label)).toEqual(["lite", "standard", "ultra", "symbolic"]);
			expect(p3.every((i) => i.value.startsWith("a.md "))).toBe(true);
		});

		it("completes nested paths through subdirectories", () => {
			mkdirSync(join(dir, "skills", "foo"), { recursive: true });
			writeFileSync(join(dir, "skills", "foo", "SKILL.md"), "x");
			writeFileSync(join(dir, "skills", "README.md"), "x");
			const cmd = createUcFileCommand({ sendUserMessage: vi.fn(), cwd: dir });

			const a = cmd.getArgumentCompletions?.("sk") ?? [];
			expect(a.map((i) => i.value)).toContain("skills/");

			const b = cmd.getArgumentCompletions?.("skills/") ?? [];
			expect(b.map((i) => i.value)).toEqual(
				expect.arrayContaining(["skills/README.md", "skills/foo/"]),
			);

			const c = cmd.getArgumentCompletions?.("skills/foo/") ?? [];
			expect(c.map((i) => i.value)).toEqual(["skills/foo/SKILL.md"]);
		});
	});
});
