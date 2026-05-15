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
});
