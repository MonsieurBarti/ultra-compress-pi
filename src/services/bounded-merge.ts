import type { SemanticSections } from "../types/session-compact.js";

type SectionKey =
	| "goal"
	| "filesAndChanges"
	| "commits"
	| "outstandingContext"
	| "userPreferences"
	| "transcript";

const HEADER_TO_KEY: Record<string, SectionKey> = {
	"[Goal]": "goal",
	"[Files & Changes]": "filesAndChanges",
	"[Commits]": "commits",
	"[Outstanding Context]": "outstandingContext",
	"[User Preferences]": "userPreferences",
	"--- Transcript ---": "transcript",
};

export function parsePreviousSummary(summary: string): SemanticSections {
	const result: SemanticSections = {
		goal: "",
		filesAndChanges: [],
		commits: [],
		outstandingContext: [],
		userPreferences: [],
		transcript: [],
	};

	if (!summary.trim()) return result;

	const lines = summary.split("\n");
	let currentKey: SectionKey | null = null;
	const buffers: Record<SectionKey, string[]> = {
		goal: [],
		filesAndChanges: [],
		commits: [],
		outstandingContext: [],
		userPreferences: [],
		transcript: [],
	};

	for (const raw of lines) {
		const line = raw.trimEnd();
		if (HEADER_TO_KEY[line]) {
			currentKey = HEADER_TO_KEY[line];
			continue;
		}
		if (currentKey) {
			buffers[currentKey].push(line);
		}
	}

	// Parse goal (first non-empty line)
	result.goal = buffers.goal.find((l) => l.trim()) ?? "";

	// Parse bullet lists for array sections
	const arrayResult = result as unknown as Record<SectionKey, string[]>;
	for (const key of [
		"filesAndChanges",
		"commits",
		"outstandingContext",
		"userPreferences",
		"transcript",
	] as SectionKey[]) {
		const items: string[] = [];
		for (const line of buffers[key]) {
			const trimmed = line.trim();
			if (!trimmed || trimmed === "None") continue;
			if (trimmed.startsWith("- ")) {
				items.push(trimmed.slice(2));
			} else if (trimmed.startsWith("1. ") || trimmed.startsWith("2. ") || /\d+\. /.test(trimmed)) {
				items.push(trimmed);
			} else {
				items.push(trimmed);
			}
		}
		arrayResult[key] = items;
	}

	return result;
}

export function mergeWithPrevious(
	previous: SemanticSections,
	current: SemanticSections,
): SemanticSections {
	// Sticky sections: accumulate with deduplication
	const mergedPrefs = [...previous.userPreferences];
	for (const p of current.userPreferences) {
		if (!mergedPrefs.includes(p)) mergedPrefs.push(p);
	}

	// Goal: overwrite with current (latest intent wins)
	const mergedGoal = current.goal || previous.goal || "No active goal";

	// Transcript: roll forward (append current to previous)
	const mergedTranscript = [...previous.transcript, ...current.transcript];

	// Volatile sections: replace entirely with current
	return {
		goal: mergedGoal,
		filesAndChanges: current.filesAndChanges,
		commits: current.commits,
		outstandingContext: current.outstandingContext,
		userPreferences: mergedPrefs.slice(0, 10),
		transcript: mergedTranscript.slice(-50), // Keep last 50 lines bounded
	};
}
