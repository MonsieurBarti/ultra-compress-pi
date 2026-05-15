import { describe, expect, it, vi } from "vitest";
import { createVccRecallCommand } from "../../src/commands/vcc-recall.js";

describe("vcc-recall command", () => {
	it("returns a CommandDefinition", () => {
		const cmd = createVccRecallCommand();
		expect(cmd.name).toBe("vcc-recall");
		expect(cmd.description).toContain("BM25");
	});

	it("notifies when no session file found", async () => {
		const cmd = createVccRecallCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: "/tmp/nonexistent", ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("no session JSONL"), "warning");
	});
});
