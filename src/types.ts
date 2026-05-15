export type Level = "off" | "lite" | "standard" | "ultra" | "symbolic";

export type ActiveLevel = Exclude<Level, "off">;

export type Mode = "runtime" | "file";

export const ALL_LEVELS = ["off", "lite", "standard", "ultra", "symbolic"] as const;
export const ACTIVE_LEVELS = ["lite", "standard", "ultra", "symbolic"] as const;

export interface SessionStats {
	startedAt: string;
	autoClarityCount: number;
	estimatedOutputCharsSaved: number;
	filesCompressed: CompressedFileEntry[];
}

export interface CompressedFileEntry {
	path: string;
	level: ActiveLevel;
	before: number;
	after: number;
	at: string;
}

export interface ProjectState {
	level: Level;
	updatedAt: string;
	session: SessionStats;
}

export interface CompressResult {
	compressed: string;
	before: number;
	after: number;
	ratio: number;
	warnings: string[];
	substitutions?: Array<{ symbol: string; concept: string }>;
}

export interface CompressOptions {
	maxRepairRetries?: number;
}

export interface ValidatorReport {
	ok: boolean;
	warnings: string[];
	errors: string[];
}

export class InvalidLevelError extends Error {
	constructor(given: string) {
		super(
			`ultra-compress: invalid level "${given}" (expected one of: off|lite|standard|ultra|symbolic)`,
		);
		this.name = "InvalidLevelError";
	}
}

export class FileTooLargeError extends Error {
	constructor(path: string, bytes: number) {
		super(`ultra-compress: file "${path}" is ${bytes} bytes (max 512000)`);
		this.name = "FileTooLargeError";
	}
}

export class BackupExistsError extends Error {
	constructor(backupPath: string) {
		super(`ultra-compress: backup "${backupPath}" already exists — run /uc-revert first`);
		this.name = "BackupExistsError";
	}
}

export class UnsupportedFileTypeError extends Error {
	constructor(path: string, reason: string) {
		super(`ultra-compress: refusing to compress "${path}": ${reason}`);
		this.name = "UnsupportedFileTypeError";
	}
}

export type {
	SessionCompactConfig,
	SessionEntry,
	StickySection,
	VolatileSection,
} from "./types/session-compact.js";
