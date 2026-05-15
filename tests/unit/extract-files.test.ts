import { describe, expect, it } from "vitest";
import { extractFileActivity } from "../../src/services/extract/files.js";
import { makeAssistantMessage } from "../fixtures/vcc-sessions.js";

describe("extractFileActivity", () => {
	it("categorizes readFile as read", () => {
		const messages = [
			makeAssistantMessage("Reading...", [
				{ id: "1", name: "readFile", arguments: { path: "src/auth.ts" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.read).toContain("src/auth.ts");
		expect(result.modified).toHaveLength(0);
	});

	it("categorizes editFile as modified", () => {
		const messages = [
			makeAssistantMessage("Editing...", [
				{ id: "1", name: "editFile", arguments: { path: "src/auth.ts" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.modified).toContain("src/auth.ts");
	});

	it("categorizes writeFile as created", () => {
		const messages = [
			makeAssistantMessage("Creating...", [
				{ id: "1", name: "writeFile", arguments: { path: "src/new.ts" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.created).toContain("src/new.ts");
	});

	it("dedupes modified from created", () => {
		const messages = [
			makeAssistantMessage("Creating...", [
				{ id: "1", name: "writeFile", arguments: { path: "src/auth.ts" } },
			]),
			makeAssistantMessage("Editing...", [
				{ id: "2", name: "editFile", arguments: { path: "src/auth.ts" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.modified).toContain("src/auth.ts");
		expect(result.created).not.toContain("src/auth.ts");
	});

	it("reads modified files from read set", () => {
		const messages = [
			makeAssistantMessage("Reading...", [
				{ id: "1", name: "readFile", arguments: { path: "src/auth.ts" } },
			]),
			makeAssistantMessage("Editing...", [
				{ id: "2", name: "editFile", arguments: { path: "src/auth.ts" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.read).not.toContain("src/auth.ts");
		expect(result.modified).toContain("src/auth.ts");
	});

	it("trims common prefix", () => {
		const messages = [
			makeAssistantMessage("Reading...", [
				{ id: "1", name: "readFile", arguments: { path: "src/components/Button.tsx" } },
			]),
			makeAssistantMessage("Reading...", [
				{ id: "2", name: "readFile", arguments: { path: "src/components/Input.tsx" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.read).toContain("Button.tsx");
		expect(result.read).toContain("Input.tsx");
	});

	it("normalizes fileOps from CompactionPreparation", () => {
		const fileOps = {
			operations: [
				{ path: "src/main.ts", type: "read" },
				{ path: "src/main.ts", type: "edit" },
			],
		};
		const result = extractFileActivity([], fileOps);
		expect(result.read).not.toContain("src/main.ts");
		expect(result.modified).toContain("src/main.ts");
	});

	it("handles unknown tool names as read", () => {
		const messages = [
			makeAssistantMessage("Checking...", [
				{ id: "1", name: "unknownTool", arguments: { path: "config.json" } },
			]),
		];
		const result = extractFileActivity(messages);
		expect(result.read).toContain("config.json");
	});

	it("returns empty for empty input", () => {
		const result = extractFileActivity([]);
		expect(result.read).toHaveLength(0);
		expect(result.modified).toHaveLength(0);
		expect(result.created).toHaveLength(0);
	});
});
