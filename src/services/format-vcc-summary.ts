import type { BriefLine } from "./extract/brief.js";
import type { FileActivity } from "./extract/files.js";

export interface VccSemanticSections {
	goal: string;
	files: FileActivity;
	commits: string[];
	outstandingContext: string[];
	userPreferences: string[];
	brief: BriefLine[];
	recallNotes?: string[];
}

export function capBrief(briefLines: BriefLine[], maxLines = 120): BriefLine[] {
	if (briefLines.length <= maxLines) return briefLines;
	// Keep tail (most recent lines), drop from head
	return briefLines.slice(-maxLines);
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

export function formatVccSummary(sections: VccSemanticSections): string {
	const lines: string[] = [];

	lines.push("[Goal]");
	lines.push(sections.goal || "No active goal");
	lines.push("");

	// Files & Changes with VCC richness
	lines.push("[Files & Changes]");
	if (
		sections.files.read.length === 0 &&
		sections.files.modified.length === 0 &&
		sections.files.created.length === 0
	) {
		lines.push("None");
	} else {
		if (sections.files.read.length > 0) {
			lines.push(`read: ${sections.files.read.join(", ")}`);
		}
		if (sections.files.modified.length > 0) {
			lines.push(`modified: ${sections.files.modified.join(", ")}`);
		}
		if (sections.files.created.length > 0) {
			lines.push(`created: ${sections.files.created.join(", ")}`);
		}
	}
	lines.push("");

	renderSection(lines, "[Commits]", sections.commits);
	renderSection(lines, "[Outstanding Context]", sections.outstandingContext);
	renderSection(lines, "[User Preferences]", sections.userPreferences);

	lines.push("[VCC Brief]");
	if (sections.brief.length > 0) {
		for (const line of sections.brief) {
			lines.push(line.content);
		}
	} else {
		lines.push("No entries");
	}

	return lines.join("\n");
}
