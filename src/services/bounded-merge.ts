import type { SemanticSections } from "../types/session-compact.js";

const MAX_PREFERENCES = 10;
const MAX_TRANSCRIPT_LINES = 50;

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
	const mergedPrefs = Array.from(
		new Set([...previous.userPreferences, ...current.userPreferences]),
	);

	const mergedGoal = current.goal || previous.goal || "No active goal";

	const mergedTranscript = [...previous.transcript, ...current.transcript];

	return {
		goal: mergedGoal,
		filesAndChanges: current.filesAndChanges,
		commits: current.commits,
		outstandingContext: current.outstandingContext,
		userPreferences: mergedPrefs.slice(0, MAX_PREFERENCES),
		transcript: mergedTranscript.slice(-MAX_TRANSCRIPT_LINES),
	};
}
