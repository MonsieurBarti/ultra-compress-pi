import { describe, expect, it, vi } from "vitest";
import { parseRecallArgs } from "../../src/commands/recall-shared.js";
import { createVccRecallCommand } from "../../src/commands/vcc-recall.js";

describe("vcc-recall command", () => {
	it("returns a CommandDefinition", () => {
		const cmd = createVccRecallCommand();
		expect(cmd.name).toBe("vcc-recall");
		expect(cmd.description).toContain("session");
	});

	it("notifies when no session file found", async () => {
		const cmd = createVccRecallCommand();
		const notify = vi.fn();
		await cmd.handler("", { cwd: "/tmp/nonexistent", ui: { notify } });
		expect(notify).toHaveBeenCalledWith(expect.stringContaining("no session JSONL"), "warning");
	});
});

describe("parseRecallArgs", () => {
	it("returns empty query for empty args", () => {
		const result = parseRecallArgs("");
		expect(result.query).toBe("");
		expect(result.page).toBe(1);
	});

	it("extracts page number", () => {
		const result = parseRecallArgs("auth page:2");
		expect(result.query).toBe("auth");
		expect(result.page).toBe(2);
	});

	it("extracts expand indices", () => {
		const result = parseRecallArgs("auth expand:1,3 page:2");
		expect(result.query).toBe("auth");
		expect(result.page).toBe(2);
		expect(result.expand).toEqual([1, 3]);
	});

	it("sanitizes page < 1 to 1", () => {
		const result = parseRecallArgs("auth page:0");
		expect(result.page).toBe(1);
	});

	it("ignores expand when no digits present", () => {
		const result = parseRecallArgs("auth expand:foo,bar");
		expect(result.expand).toBeUndefined();
	});
});
