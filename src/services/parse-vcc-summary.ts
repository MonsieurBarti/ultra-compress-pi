import type { VccSemanticSections } from "./format-vcc-summary.js";

type VccSectionKey =
	| "goal"
	| "files"
	| "commits"
	| "outstandingContext"
	| "userPreferences"
	| "brief"
	| "recallNotes";

const HEADER_TO_KEY: Record<string, VccSectionKey> = {
	"[Goal]": "goal",
	"[Files & Changes]": "files",
	"[Commits]": "commits",
	"[Outstanding Context]": "outstandingContext",
	"[User Preferences]": "userPreferences",
	"[VCC Brief]": "brief",
	"[RECALL_NOTE]": "recallNotes",
};

export function parsePreviousSummaryVcc(summary: string): VccSemanticSections {
	const result: VccSemanticSections = {
		goal: "",
		files: { read: [], modified: [], created: [] },
		commits: [],
		outstandingContext: [],
		userPreferences: [],
		brief: [],
		recallNotes: [],
	};

	if (!summary.trim()) return result;

	const lines = summary.split("\n");
	let currentSection: VccSectionKey | null = null;
	const buffers: Record<VccSectionKey, string[]> = {
		goal: [],
		files: [],
		commits: [],
		outstandingContext: [],
		userPreferences: [],
		brief: [],
		recallNotes: [],
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		const key = HEADER_TO_KEY[line];
		if (key) {
			currentSection = key;
			continue;
		}
		if (currentSection) {
			buffers[currentSection].push(line);
		}
	}

	// Parse goal (first non-empty line, excluding "None")
	result.goal = buffers.goal.find((l) => l.trim() && l.trim() !== "None") ?? "";

	// Parse files with VCC richness
	for (const line of buffers.files) {
		const trimmed = line.trim();
		if (!trimmed || trimmed === "None") continue;
		if (trimmed.startsWith("read: ")) {
			result.files.read.push(...trimmed.slice(6).split("; ").filter(Boolean));
		} else if (trimmed.startsWith("modified: ")) {
			result.files.modified.push(...trimmed.slice(10).split("; ").filter(Boolean));
		} else if (trimmed.startsWith("created: ")) {
			result.files.created.push(...trimmed.slice(9).split("; ").filter(Boolean));
		} else if (trimmed.startsWith("- ")) {
			// Fallback: old-style bullet list → treat as read
			result.files.read.push(trimmed.slice(2));
		} else {
			result.files.read.push(trimmed);
		}
	}

	// Parse bullet lists for array sections
	for (const key of ["commits", "outstandingContext", "userPreferences", "recallNotes"] as const) {
		for (const line of buffers[key]) {
			const trimmed = line.trim();
			if (!trimmed || trimmed === "None") continue;
			if (trimmed.startsWith("- ")) {
				(result[key] as string[]).push(trimmed.slice(2));
			} else {
				(result[key] as string[]).push(trimmed);
			}
		}
	}

	// Parse brief lines
	for (const line of buffers.brief) {
		const trimmed = line.trim();
		if (!trimmed || trimmed === "No entries") continue;
		result.brief.push({ role: "unknown", content: trimmed, turn: 0 });
	}

	return result;
}
