import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../../src/commands/types";
import { createUcFileCommand } from "../../src/commands/uc-file";
import { setProjectRootForTest } from "../../src/services/state-store";

describe("uc-file receives modelRegistry via CommandContext", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-mr-"));
		setProjectRootForTest(dir);
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("passes modelRegistry from CommandContext into the llm factory", async () => {
		const filePath = join(dir, "doc.md");
		writeFileSync(filePath, "The quick fox.\n");
		const notify = vi.fn();
		const llmFactorySpy = vi.fn((_ctx: CommandContext) => vi.fn(async () => "Fox."));
		const fakeRegistry = {
			find: () => ({}),
			getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "x", headers: {} }),
		};
		const cmd = createUcFileCommand({ llm: llmFactorySpy });
		await cmd.handler(`${filePath} standard --yes`, {
			cwd: dir,
			ui: { notify },
			model: { provider: "anthropic", name: "test" },
			modelRegistry: fakeRegistry,
		});
		expect(llmFactorySpy).toHaveBeenCalledTimes(1);
		const firstCallCtx = llmFactorySpy.mock.calls[0]?.[0];
		if (!firstCallCtx) throw new Error("llmFactorySpy was not called");
		expect(firstCallCtx.modelRegistry).toBe(fakeRegistry);
	});
});
