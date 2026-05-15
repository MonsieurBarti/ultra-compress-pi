import type { VccSemanticSections } from "./format-vcc-summary.js";

const MAX_PREFERENCES = 10;
const MAX_RECALL_NOTES = 20;
const MAX_BRIEF_LINES = 120;

function dedupStrings(arr: string[]): string[] {
	return Array.from(new Set(arr));
}

function mergeFileActivity(
	previous: VccSemanticSections["files"],
	current: VccSemanticSections["files"],
): VccSemanticSections["files"] {
	// Sticky modified files (if a file was modified before, it stays modified)
	const modified = dedupStrings([...previous.modified, ...current.modified]);
	// Read files: current wins, but modified files drop from read
	const read = dedupStrings(current.read.filter((f) => !modified.includes(f)));
	// Created files: current wins, but modified files drop from created
	const created = dedupStrings(current.created.filter((f) => !modified.includes(f)));
	return { read, modified, created };
}

export function mergeWithPreviousVcc(
	previous: VccSemanticSections,
	current: VccSemanticSections,
): VccSemanticSections {
	// Sticky fields: merge with dedup, prefer current when both present
	const goal = current.goal || previous.goal || "No active goal";
	const userPreferences = dedupStrings([
		...previous.userPreferences,
		...current.userPreferences,
	]).slice(0, MAX_PREFERENCES);
	const recallNotes = dedupStrings([
		...(previous.recallNotes ?? []),
		...(current.recallNotes ?? []),
	]).slice(0, MAX_RECALL_NOTES);

	// Volatile fields: current replaces previous
	const files = mergeFileActivity(previous.files, current.files);
	const commits = current.commits;
	const outstandingContext = current.outstandingContext;

	// Brief: roll (keep tail)
	const brief = [...previous.brief, ...current.brief].slice(-MAX_BRIEF_LINES);

	return {
		goal,
		files,
		commits,
		outstandingContext,
		userPreferences,
		brief,
		recallNotes,
	};
}

/** Injects a RECALL_NOTE into a VccSemanticSections object */
export function injectRecallNote(sections: VccSemanticSections, note: string): VccSemanticSections {
	const notes = sections.recallNotes ?? [];
	if (!notes.includes(note)) {
		return { ...sections, recallNotes: [...notes, note] };
	}
	return sections;
}
