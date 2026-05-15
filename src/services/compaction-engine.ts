import type { SemanticSections, TranscriptMessage } from "../types/session-compact.js";

function extractGoal(messages: TranscriptMessage[]): string {
	const firstUser = messages.find((m) => m.role === "user");
	if (firstUser) {
		const text = firstUser.content.trim();
		const sentence = text.split(/[.!?]/, 1)[0] ?? "";
		return sentence.length > 120 ? `${sentence.slice(0, 120)}...` : sentence;
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
		// Regex fallback for inline file paths
		const matches = msg.content.matchAll(
			/(?:src\/|tests\/|docs\/|package\.json|tsconfig\.json)[\w/.-]+/g,
		);
		for (const match of matches) files.add(match[0] ?? "");
	}
	return Array.from(files).slice(0, 20);
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
	return commits.slice(0, 10);
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
	return items.slice(0, 10);
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
	return prefs.slice(0, 10);
}

function buildTranscript(messages: TranscriptMessage[]): string[] {
	const lines: string[] = [];
	let idx = 1;
	for (const msg of messages) {
		if (msg.toolCalls && msg.toolCalls.length > 0) {
			for (const tc of msg.toolCalls) {
				const args = Object.entries(tc.arguments ?? {})
					.map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`)
					.join(" ");
				lines.push(`${idx}. tool_call: ${tc.name}(${args}) (#${tc.id})`);
				idx++;
			}
		} else if (msg.toolResults && msg.toolResults.length > 0) {
			for (const tr of msg.toolResults) {
				const preview = tr.content.slice(0, 100).replace(/\n/g, " ");
				lines.push(`${idx}. tool_result: ${preview}${tr.content.length > 100 ? "..." : ""}`);
				idx++;
			}
		} else {
			const preview = msg.content.slice(0, 200).replace(/\n/g, " ");
			lines.push(`${idx}. ${msg.role}: ${preview}${msg.content.length > 200 ? "..." : ""}`);
			idx++;
		}
	}
	return lines;
}

export function extractSections(messages: TranscriptMessage[]): SemanticSections {
	return {
		goal: extractGoal(messages),
		filesAndChanges: extractFilesAndChanges(messages),
		commits: extractCommits(messages),
		outstandingContext: extractOutstandingContext(messages),
		userPreferences: extractUserPreferences(messages),
		transcript: buildTranscript(messages),
	};
}

export function formatSummary(sections: SemanticSections): string {
	const lines: string[] = [];

	lines.push("[Goal]");
	lines.push(sections.goal || "No active goal");
	lines.push("");

	lines.push("[Files & Changes]");
	if (sections.filesAndChanges.length > 0) {
		for (const f of sections.filesAndChanges) lines.push(`- ${f}`);
	} else {
		lines.push("None");
	}
	lines.push("");

	lines.push("[Commits]");
	if (sections.commits.length > 0) {
		for (const c of sections.commits) lines.push(`- ${c}`);
	} else {
		lines.push("None");
	}
	lines.push("");

	lines.push("[Outstanding Context]");
	if (sections.outstandingContext.length > 0) {
		for (const o of sections.outstandingContext) lines.push(`- ${o}`);
	} else {
		lines.push("None");
	}
	lines.push("");

	lines.push("[User Preferences]");
	if (sections.userPreferences.length > 0) {
		for (const p of sections.userPreferences) lines.push(`- ${p}`);
	} else {
		lines.push("None");
	}
	lines.push("");

	lines.push("--- Transcript ---");
	if (sections.transcript.length > 0) {
		for (const t of sections.transcript) lines.push(t);
	} else {
		lines.push("No entries");
	}

	return lines.join("\n");
}

export function compactSession(messages: TranscriptMessage[]): string {
	const sections = extractSections(messages);
	return formatSummary(sections);
}
