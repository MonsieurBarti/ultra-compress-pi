import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSessionEntries, resolveSessionJsonlPath } from "../../src/services/session-reader.js";

describe("session-reader", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "uc-session-reader-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("resolves session JSONL from explicit override", () => {
		const explicit = join(dir, "custom.jsonl");
		writeFileSync(explicit, "\n");
		const resolved = resolveSessionJsonlPath({ explicitPath: explicit });
		expect(resolved).toBe(explicit);
	});

	it("falls back to .pi/session.jsonl when present", () => {
		const piDir = join(dir, ".pi");
		mkdirSync(piDir, { recursive: true });
		const fallback = join(piDir, "session.jsonl");
		writeFileSync(fallback, "\n");
		const resolved = resolveSessionJsonlPath({ projectRoot: dir });
		expect(resolved).toBe(fallback);
	});

	it("returns null when no session file is found", () => {
		const resolved = resolveSessionJsonlPath({ projectRoot: dir });
		expect(resolved).toBeNull();
	});

	it("reads valid JSONL entries", async () => {
		const path = join(dir, "session.jsonl");
		writeFileSync(
			path,
			[
				JSON.stringify({ id: "1", type: "user", content: "hello" }),
				JSON.stringify({ id: "2", type: "assistant", content: "hi" }),
			].join("\n"),
		);
		const entries = await readSessionEntries(path);
		expect(entries).toHaveLength(2);
		expect(entries[0]?.id).toBe("1");
		expect(entries[1]?.type).toBe("assistant");
	});

	it("skips empty lines and malformed JSONL entries", async () => {
		const path = join(dir, "session.jsonl");
		writeFileSync(
			path,
			[
				JSON.stringify({ id: "1", type: "user" }),
				"",
				"not-json",
				JSON.stringify({ id: "2", type: "assistant" }),
			].join("\n"),
		);
		const entries = await readSessionEntries(path);
		expect(entries).toHaveLength(2);
		expect(entries[0]?.id).toBe("1");
		expect(entries[1]?.id).toBe("2");
	});

	it("returns empty array for nonexistent path", async () => {
		const entries = await readSessionEntries(join(dir, "missing.jsonl"));
		expect(entries).toEqual([]);
	});
});
