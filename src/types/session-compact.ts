export interface SessionCompactConfig {
	overrideDefaultCompaction: boolean;
	useLLMForGoal: boolean;
	updatedAt: string;
}

export type StickySection = "Goal" | "User Preferences";
export type VolatileSection = "Files & Changes" | "Commits" | "Outstanding Context";

export interface SessionEntry {
	id: string;
	type: string;
	content?: unknown;
	// Loose shape — session JSONL entries vary
}
