import type { VccSemanticSections } from "./format-vcc-summary.js";

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
	let currentSection: string | null = null;
	const buffers: {
		goal: string[];
		files: string[];
		commits: string[];
		outstandingContext: string[];
		userPreferences: string[];
		brief: string[];
		recallNotes: string[];
	} = {
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
		if (line === "[Goal]") {
			currentSection = "goal";
			continue;
		}
		if (line === "[Files & Changes]") {
			currentSection = "files";
			continue;
		}
		if (line === "[Commits]") {
			currentSection = "commits";
			continue;
		}
		if (line === "[Outstanding Context]") {
			currentSection = "outstandingContext";
			continue;
		}
		if (line === "[User Preferences]") {
			currentSection = "userPreferences";
			continue;
		}
		if (line === "[VCC Brief]") {
			currentSection = "brief";
			continue;
		}
		if (line === "[RECALL_NOTE]") {
			currentSection = "recallNotes";
			continue;
		}
		if (currentSection && currentSection in buffers) {
			buffers[currentSection as keyof typeof buffers].push(line);
		}
	}

	// Parse goal (first non-empty line, excluding "None")
	result.goal = buffers.goal.find((l) => l.trim() && l.trim() !== "None") ?? "";

	// Parse files with VCC richness
	for (const line of buffers.files) {
		const trimmed = line.trim();
		if (!trimmed || trimmed === "None") continue;
		if (trimmed.startsWith("read: ")) {
			result.files.read.push(...trimmed.slice(6).split(", ").filter(Boolean));
		} else if (trimmed.startsWith("modified: ")) {
			result.files.modified.push(...trimmed.slice(10).split(", ").filter(Boolean));
		} else if (trimmed.startsWith("created: ")) {
			result.files.created.push(...trimmed.slice(9).split(", ").filter(Boolean));
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
