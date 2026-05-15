import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createUcRecallCommand } from "../../src/commands/uc-recall.js";

describe("uc-recall command", () => {
	it("returns a CommandDefinition", () => {
		const cmd = createUcRecallCommand();
		expect(cmd.name).toBe("uc-recall");
		expect(cmd.description).toContain("recall");
		expect(typeof cmd.handler).toBe("function");
	});

	it("notifies when no session found", async () => {
		const cmd = createUcRecallCommand();
		const notify = vi.fn();
		await cmd.handler("auth", { cwd: process.cwd(), ui: { notify } });
		expect(notify).toHaveBeenCalled();
	});

	it("uses sessionManager.getSessionFile() when available", async () => {
		const dir = mkdtempSync(join(tmpdir(), "uc-recall-test-"));
		const sessionFile = join(dir, "session.jsonl");
		writeFileSync(
			sessionFile,
			`${JSON.stringify({ id: "1", type: "user", content: "hello world" })}
`,
		);
		const cmd = createUcRecallCommand();
		const notify = vi.fn();
		await cmd.handler("hello", {
			cwd: process.cwd(),
			ui: { notify },
			sessionManager: { getSessionFile: () => sessionFile },
		});
		expect(notify).toHaveBeenCalled();
		const lastCall = notify.mock.calls[notify.mock.calls.length - 1];
		expect(lastCall?.[1]).toBe("info");
		expect(lastCall?.[0]).toContain("hello");
	});
});
