import type {
	EnhanceGoalFn,
	SemanticSections,
	TranscriptMessage,
} from "../types/session-compact.js";

const MAX_FILES = 20;
const MAX_COMMITS = 10;
const MAX_CONTEXT_ITEMS = 10;
const MAX_PREFERENCES = 10;
const MAX_TOOL_ARGS_PREVIEW = 80;
const MAX_TOOL_RESULT_PREVIEW = 100;
const MAX_MESSAGE_PREVIEW = 200;
const MAX_GOAL_LENGTH = 120;

export interface ExtractOptions {
	enhanceGoal?: EnhanceGoalFn | undefined;
}

function truncate(text: string, limit: number): string {
	const cleaned = text.replace(/\n/g, " ");
	return cleaned.length > limit ? `${cleaned.slice(0, limit)}...` : cleaned;
}

function extractGoal(messages: TranscriptMessage[]): string {
	const firstUser = messages.find((m) => m.role === "user");
	if (firstUser) {
		const text = firstUser.content.trim();
		const sentence = text.split(/[.!?]/, 1)[0] ?? "";
		return sentence.length > MAX_GOAL_LENGTH
			? `${sentence.slice(0, MAX_GOAL_LENGTH)}...`
			: sentence;
	}
	return "No active goal";
}

function extractFilesAndChanges(messages: TranscriptMessage[]): string[] {
	const files = new Set<string>();
	for (const msg of messages) {
		if (msg.toolCalls) {
			for (const tc of msg.toolCalls) {
				const args = tc.arguments ?? {};
				if (args.path && typeof args.path === "string") files.add(args.path);
				if (args.paths && Array.isArray(args.paths)) {
					for (const p of args.paths) if (typeof p === "string") files.add(p);
				}
			}
		}
		const matches = msg.content.matchAll(
			/(?:src\/|tests\/|docs\/|package\.json|tsconfig\.json)[\w/.-]+/g,
		);
		for (const match of matches) files.add(match[0] ?? "");
	}
	return Array.from(files).slice(0, MAX_FILES);
}

function extractCommits(messages: TranscriptMessage[]): string[] {
	const commits: string[] = [];
	for (const msg of messages) {
		const matches = msg.content.matchAll(/(?:commit|git commit|committed?)[\s:-]+(.+)/gi);
		for (const match of matches) {
			const text = match[1]?.trim();
			if (text) commits.push(text);
		}
	}
	return commits.slice(0, MAX_COMMITS);
}

function extractOutstandingContext(messages: TranscriptMessage[]): string[] {
	const items: string[] = [];
	for (const msg of messages) {
		if (msg.role === "user" && /\?(?:\s|$)/.test(msg.content)) {
			const q = msg.content.trim();
			if (q.length < 200) items.push(q);
		}
		const todos = msg.content.matchAll(/(?:TODO|FIXME|HACK|BUG)(?:[:\s]+)(.+)/gi);
		for (const match of todos) {
			const todo = match[1]?.trim();
			if (todo) items.push(todo);
		}
	}
	return items.slice(0, MAX_CONTEXT_ITEMS);
}

function extractUserPreferences(messages: TranscriptMessage[]): string[] {
	const prefs: string[] = [];
	for (const msg of messages) {
		if (msg.role !== "user") continue;
		const sentences = msg.content.split(/[.!?]+/);
		for (const sentence of sentences) {
			const lower = sentence.toLowerCase();
			if (
				lower.includes("use ") ||
				lower.includes("prefer ") ||
				lower.includes("enable ") ||
				lower.includes("disable ") ||
				lower.includes("don't ") ||
				lower.includes("do not ") ||
				lower.includes("keep ") ||
				lower.includes("separate ")
			) {
				const trimmed = sentence.trim();
				if (trimmed.length > 5 && trimmed.length < 200) prefs.push(trimmed);
			}
		}
	}
	return prefs.slice(0, MAX_PREFERENCES);
}

function buildTranscript(messages: TranscriptMessage[]): string[] {
	const lines: string[] = [];
	let idx = 1;
	for (const msg of messages) {
		if (msg.toolCalls && msg.toolCalls.length > 0) {
			for (const tc of msg.toolCalls) {
				const args = Object.entries(tc.arguments ?? {})
					.map(([k, v]) => `${k}=${truncate(JSON.stringify(v), MAX_TOOL_ARGS_PREVIEW)}`)
					.join(" ");
				lines.push(`${idx}. tool_call: ${tc.name}(${args}) (#${tc.id})`);
				idx++;
			}
		} else if (msg.toolResults && msg.toolResults.length > 0) {
			for (const tr of msg.toolResults) {
				lines.push(`${idx}. tool_result: ${truncate(tr.content, MAX_TOOL_RESULT_PREVIEW)}`);
				idx++;
			}
		} else {
			lines.push(`${idx}. ${msg.role}: ${truncate(msg.content, MAX_MESSAGE_PREVIEW)}`);
			idx++;
		}
	}
	return lines;
}

export async function extractSections(
	messages: TranscriptMessage[],
	options: ExtractOptions = {},
): Promise<SemanticSections> {
	let goal = extractGoal(messages);
	if (options.enhanceGoal && messages.length > 0) {
		try {
			const enhanced = await options.enhanceGoal(messages);
			if (enhanced.trim()) goal = enhanced;
		} catch {
			// Fallback to algorithmic goal on any failure
		}
	}
	return {
		goal,
		filesAndChanges: extractFilesAndChanges(messages),
		commits: extractCommits(messages),
		outstandingContext: extractOutstandingContext(messages),
		userPreferences: extractUserPreferences(messages),
		transcript: buildTranscript(messages),
	};
}

function renderSection(lines: string[], header: string, items: string[]): void {
	lines.push(header);
	if (items.length > 0) {
		for (const item of items) lines.push(`- ${item}`);
	} else {
		lines.push("None");
	}
	lines.push("");
}

export function formatSummary(sections: SemanticSections): string {
	const lines: string[] = [];

	lines.push("[Goal]");
	lines.push(sections.goal || "No active goal");
	lines.push("");

	renderSection(lines, "[Files & Changes]", sections.filesAndChanges);
	renderSection(lines, "[Commits]", sections.commits);
	renderSection(lines, "[Outstanding Context]", sections.outstandingContext);
	renderSection(lines, "[User Preferences]", sections.userPreferences);

	lines.push("--- Transcript ---");
	if (sections.transcript.length > 0) {
		for (const t of sections.transcript) lines.push(t);
	} else {
		lines.push("No entries");
	}

	return lines.join("\n");
}

export async function compactSession(
	messages: TranscriptMessage[],
	options: ExtractOptions = {},
): Promise<string> {
	const sections = await extractSections(messages, options);
	return formatSummary(sections);
}
