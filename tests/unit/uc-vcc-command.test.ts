import { describe, expect, it, vi } from "vitest";
import { createUcVccCommand } from "../../src/commands/uc-vcc.js";

describe("uc-vcc command", () => {
	it("returns a CommandDefinition", () => {
		const cmd = createUcVccCommand();
		expect(cmd.name).toBe("uc-vcc");
		expect(cmd.description).toContain("VCC");
	});

	it("notifies when no session file found", async () => {
		const cmd = createUcVccCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: "/tmp/nonexistent", ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("no session JSONL"), "warning");
	});

	it("uses sessionManager.getSessionFile() when available", async () => {
		const cmd = createUcVccCommand();
		const notify = vi.fn();
		await cmd.handler("", {
			cwd: "/tmp/nonexistent",
			ui: { notify },
			sessionManager: { getSessionFile: () => "/tmp/nonexistent/session.jsonl" },
		});
		// Session file path resolved but file doesn't exist → readSessionEntries returns []
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("session is empty"), "info");
	});
});
