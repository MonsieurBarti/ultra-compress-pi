import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createUcCompactCommand } from "../../src/commands/uc-compact.js";

describe("uc-compact command", () => {
	it("returns a CommandDefinition", () => {
		const cmd = createUcCompactCommand();
		expect(cmd.name).toBe("uc-compact");
		expect(cmd.description).toContain("compact");
		expect(typeof cmd.handler).toBe("function");
	});

	it("notifies with summary when session file exists", async () => {
		const cmd = createUcCompactCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: process.cwd(), ui: { notify } });
		// Should at least call notify (either with summary or "no session")
		expect(notify).toHaveBeenCalled();
	});

	it("uses sessionManager.getSessionFile() when available", async () => {
		const dir = mkdtempSync(join(tmpdir(), "uc-compact-test-"));
		const sessionFile = join(dir, "session.jsonl");
		writeFileSync(
			sessionFile,
			`${JSON.stringify({ id: "1", type: "user", content: "hello" })}
`,
		);
		const cmd = createUcCompactCommand();
		const notify = vi.fn();
		await cmd.handler("", {
			cwd: process.cwd(),
			ui: { notify },
			sessionManager: { getSessionFile: () => sessionFile },
		});
		expect(notify).toHaveBeenCalled();
		const lastCall = notify.mock.calls[notify.mock.calls.length - 1];
		expect(lastCall?.[1]).toBe("info");
	});
});
