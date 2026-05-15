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
});
