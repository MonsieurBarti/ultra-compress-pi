import type { TranscriptMessage } from "../../src/types/session-compact.js";

export function makeTranscriptMessage(
	role: TranscriptMessage["role"],
	content: string,
	opts?: {
		toolCalls?: TranscriptMessage["toolCalls"];
		toolResults?: TranscriptMessage["toolResults"];
	},
): TranscriptMessage {
	const msg: TranscriptMessage = { role, content };
	if (opts?.toolCalls) msg.toolCalls = opts.toolCalls;
	if (opts?.toolResults) msg.toolResults = opts.toolResults;
	return msg;
}

export function makeUserMessage(content: string): TranscriptMessage {
	return makeTranscriptMessage("user", content);
}

export function makeAssistantMessage(
	content: string,
	toolCalls?: TranscriptMessage["toolCalls"],
): TranscriptMessage {
	return makeTranscriptMessage("assistant", content, { toolCalls });
}

export function makeThinkingMessage(content: string): TranscriptMessage {
	return makeTranscriptMessage("thinking", content);
}

export function makeToolCallMessage(
	name: string,
	args: Record<string, unknown>,
): TranscriptMessage {
	return makeTranscriptMessage("tool_call", "", {
		toolCalls: [{ id: `tc-${name}`, name, arguments: args }],
	});
}

export function makeToolResultMessage(content: string): TranscriptMessage {
	return makeTranscriptMessage("tool_result", content, {
		toolResults: [{ id: "tr-1", content }],
	});
}

/** Generates a realistic multi-turn session with tool calls */
export function makeMultiTurnSession(): TranscriptMessage[] {
	return [
		makeUserMessage("Implement user authentication with JWT tokens"),
		makeAssistantMessage("I'll set up the auth module", [
			{ id: "1", name: "readFile", arguments: { path: "src/auth.ts" } },
		]),
		makeToolResultMessage("export function verify() { ... }"),
		makeUserMessage("Instead, switch to OAuth2 integration"),
		makeAssistantMessage("Let me check the OAuth docs", [
			{ id: "2", name: "readFile", arguments: { path: "docs/oauth.md" } },
		]),
		makeToolResultMessage("# OAuth2 Setup Guide..."),
		makeAssistantMessage(
			"<thinking>Need to restructure the auth flow</thinking> I'll update the auth module.",
			[{ id: "3", name: "editFile", arguments: { path: "src/auth.ts", content: "..." } }],
		),
		makeToolResultMessage("File updated successfully"),
	];
}

/** Generates a session with scope-change signals */
export function makeScopeChangeSession(): TranscriptMessage[] {
	return [
		makeUserMessage("Build a React dashboard with charts"),
		makeAssistantMessage("I'll create the dashboard component"),
		makeUserMessage("Actually, change of plan — use Vue instead of React"),
		makeAssistantMessage("Switching to Vue framework"),
		makeUserMessage("Let's pivot to Svelte for better performance"),
	];
}

/** Generates a session with repeated tool calls for dedup testing */
export function makeRepeatedToolSession(): TranscriptMessage[] {
	return [
		makeUserMessage("Check the database schema"),
		makeAssistantMessage("Reading schema...", [
			{ id: "1", name: "readFile", arguments: { path: "schema.sql" } },
		]),
		makeToolResultMessage("CREATE TABLE users..."),
		makeUserMessage("Now check the migration files"),
		makeAssistantMessage("Reading migrations...", [
			{ id: "2", name: "readFile", arguments: { path: "schema.sql" } },
		]),
		makeToolResultMessage("-- migration 001..."),
	];
}
