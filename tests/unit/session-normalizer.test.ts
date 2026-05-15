import { describe, expect, it } from "vitest";
import {
	normalizeAgentMessages,
	normalizeSessionEntries,
} from "../../src/services/session-normalizer.js";
import type { AgentMessage, SessionEntry } from "../../src/types/session-compact.js";

describe("session-normalizer", () => {
	it("normalizes user+assistant AgentMessages", () => {
		const messages: AgentMessage[] = [
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi there" },
		];
		const out = normalizeAgentMessages(messages);
		expect(out).toHaveLength(2);
		expect(out[0]?.role).toBe("user");
		expect(out[0]?.content).toBe("hello");
		expect(out[1]?.role).toBe("assistant");
	});

	it("normalizes tool_call and tool_result AgentMessages", () => {
		const messages: AgentMessage[] = [
			{
				role: "assistant",
				content: "",
				toolCalls: [{ id: "1", name: "readFile", arguments: { path: "src/index.ts" } }],
			},
			{ role: "tool", content: "file content", toolCallId: "1" },
		];
		const out = normalizeAgentMessages(messages);
		expect(out.some((m) => m.role === "tool_call")).toBe(true);
		expect(out.some((m) => m.role === "tool_result")).toBe(true);
	});

	it("normalizes SessionEntries", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "user", content: "hello" },
			{ id: "2", type: "assistant", content: "hi" },
		];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(2);
		expect(out[0]?.role).toBe("user");
	});

	it("filters out system messages", () => {
		const messages: AgentMessage[] = [
			{ role: "system", content: "you are a helpful assistant" },
			{ role: "user", content: "hello" },
		];
		const out = normalizeAgentMessages(messages);
		expect(out).toHaveLength(1);
		expect(out[0]?.role).toBe("user");
	});

	it("skips empty content blocks", () => {
		const messages: AgentMessage[] = [
			{ role: "user", content: "" },
			{ role: "user", content: "hello" },
		];
		const out = normalizeAgentMessages(messages);
		expect(out).toHaveLength(1);
	});
});
