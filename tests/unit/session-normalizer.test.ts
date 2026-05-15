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

	it("extracts text from assistant content arrays", () => {
		const messages = [
			{
				role: "assistant",
				content: [
					{ type: "text", text: "Hello" },
					{ type: "thinking", thinking: "..." },
				],
			},
		] as AgentMessage[];
		const out = normalizeAgentMessages(messages);
		expect(out).toHaveLength(1);
		expect(out[0]?.content).toBe("Hello ...");
		expect(out[0]?.role).toBe("assistant");
	});

	it("extracts tool calls from assistant content arrays", () => {
		const messages = [
			{
				role: "assistant",
				content: [
					{ type: "text", text: "I'll help" },
					{
						type: "toolCall",
						id: "tc-1",
						name: "readFile",
						arguments: { path: "src/index.ts" },
					},
				],
			},
		] as AgentMessage[];
		const out = normalizeAgentMessages(messages);
		expect(out).toHaveLength(1);
		expect(out[0]?.toolCalls).toHaveLength(1);
		expect(out[0]?.toolCalls?.[0]?.name).toBe("readFile");
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

	it("normalizes PI session JSONL nested message entries", () => {
		const entries: SessionEntry[] = [
			{
				id: "1",
				type: "message",
				message: { role: "user", content: "hello" },
			},
			{
				id: "2",
				type: "message",
				message: { role: "assistant", content: [{ type: "text", text: "hi!" }] },
			},
		];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(2);
		expect(out[0]?.role).toBe("user");
		expect(out[0]?.content).toBe("hello");
		expect(out[1]?.role).toBe("assistant");
		expect(out[1]?.content).toBe("hi!");
	});

	it("extracts text from content arrays (text + thinking blocks)", () => {
		const entries: SessionEntry[] = [
			{
				id: "1",
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "text", text: "Let me think" },
						{ type: "thinking", thinking: "processing..." },
						{ type: "text", text: "Done!" },
					],
				},
			},
		];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(1);
		expect(out[0]?.content).toBe("Let me think processing... Done!");
	});

	it("extracts tool calls from content arrays", () => {
		const entries: SessionEntry[] = [
			{
				id: "1",
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "text", text: "I'll read the file" },
						{
							type: "toolCall",
							id: "tc-1",
							name: "readFile",
							arguments: { path: "src/index.ts" },
						},
					],
				},
			},
		];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(1);
		expect(out[0]?.toolCalls).toHaveLength(1);
		expect(out[0]?.toolCalls?.[0]?.name).toBe("readFile");
	});

	it("normalizes toolResult entries from session JSONL", () => {
		const entries: SessionEntry[] = [
			{
				id: "1",
				type: "message",
				message: {
					role: "toolResult",
					toolCallId: "tc-1",
					content: [{ type: "text", text: "file contents" }],
				} as AgentMessage,
			},
		];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(1);
		expect(out[0]?.role).toBe("tool_result");
		expect(out[0]?.toolResults).toEqual([{ id: "tc-1", content: "file contents" }]);
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

	it("normalizes unknown role to thinking", () => {
		const messages = [{ role: "unknown", content: "something" }] as AgentMessage[];
		const out = normalizeAgentMessages(messages);
		expect(out[0]?.role).toBe("thinking");
	});

	it("handles AgentMessage with toolCallId and toolResults", () => {
		const messages = [
			{ role: "tool", content: "result data", toolCallId: "tc-1", toolResults: "ok" },
		] as AgentMessage[];
		const out = normalizeAgentMessages(messages);
		expect(out[0]?.toolResults).toEqual([{ id: "tc-1", content: "ok" }]);
	});

	it("filters system SessionEntries", () => {
		const entries = [
			{ id: "1", type: "system", content: "instructions" },
			{ id: "2", type: "user", content: "hello" },
		] as SessionEntry[];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(1);
		expect(out[0]?.role).toBe("user");
	});

	it("skips empty-content SessionEntries", () => {
		const entries = [
			{ id: "1", type: "user", content: "" },
			{ id: "2", type: "user", content: "hello" },
		] as SessionEntry[];
		const out = normalizeSessionEntries(entries);
		expect(out).toHaveLength(1);
	});
});
