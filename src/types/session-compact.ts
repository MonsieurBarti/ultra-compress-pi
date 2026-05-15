/**
 * Session compaction types — inlined structural types based on PI SDK.
 *
 * The `session_before_compact` hook receives:
 *   { preparation: CompactionPreparation, branchEntries: SessionEntry[], customInstructions?: string, signal: AbortSignal }
 *
 * It should return:
 *   { cancel?: boolean; compaction?: CompactionResult }
 *
 * When overrideDefaultCompaction is false (default), the hook returns undefined
 * and PI's default LLM-based compaction runs.
 */

export interface CompactionSettings {
	enabled: boolean;
	reserveTokens: number;
	keepRecentTokens: number;
}

export interface AgentMessage {
	role: string;
	content: unknown;
	toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
	toolCallId?: string;
	toolResults?: unknown;
}

export interface FileOperations {
	operations: unknown[];
}

export interface CompactionPreparation {
	firstKeptEntryId: string;
	messagesToSummarize: AgentMessage[];
	turnPrefixMessages: AgentMessage[];
	isSplitTurn: boolean;
	tokensBefore: number;
	previousSummary?: string;
	fileOps: FileOperations;
	settings: CompactionSettings;
}

export interface CompactionResult {
	summary: string;
	firstKeptEntryId: string;
	tokensBefore: number;
	details?: unknown;
}

export interface SessionBeforeCompactResult {
	cancel?: boolean;
	compaction?: CompactionResult;
}

export interface SessionBeforeCompactEvent {
	preparation: CompactionPreparation;
	branchEntries: SessionEntry[];
	customInstructions?: string;
	signal: AbortSignal;
}

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

export interface TranscriptMessage {
	role: "user" | "assistant" | "tool_call" | "tool_result" | "system" | "thinking";
	content: string;
	toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
	toolResults?: Array<{ id: string; content: string }>;
}

export type EnhanceGoalFn = (messages: TranscriptMessage[]) => Promise<string>;

export interface SemanticSections {
	goal: string;
	filesAndChanges: string[];
	commits: string[];
	outstandingContext: string[];
	userPreferences: string[];
	transcript: string[];
}

export interface RecallMatch {
	index: number;
	entry: SessionEntry;
	score: number;
	matchedTerms: string[];
}

export interface RecallResult {
	matches: RecallMatch[];
	total: number;
	page: number;
	pageSize: number;
}
