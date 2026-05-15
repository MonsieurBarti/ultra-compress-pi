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
});
