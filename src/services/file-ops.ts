import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { BackupExistsError, FileTooLargeError, UnsupportedFileTypeError } from "../types.js";
import { backupPathFor } from "./backup-path.js";
import { safeResolveInCwd } from "./path-guard.js";

const MAX_BYTES = 500 * 1024;
const SUPPORTED_EXT = new Set([".md", ".txt", ".rst", ".markdown"]);

export function isSupportedExtension(ext: string): boolean {
	return SUPPORTED_EXT.has(ext.toLowerCase());
}

export function extOf(path: string): string {
	const i = path.lastIndexOf(".");
	return i >= 0 ? path.slice(i).toLowerCase() : "";
}

// Resolve `inputPath` against `cwd` with path-traversal + symlink guards,
// reject unsupported extensions and over-size files, and reject if a backup
// already exists. Returns { abs, backupPath, content } ready for compression.
export function resolveForCompression(
	inputPath: string,
	cwd: string,
): { abs: string; backupPath: string; content: string } {
	const abs = safeResolveInCwd(inputPath, cwd);

	if (!existsSync(abs)) {
		throw new UnsupportedFileTypeError(abs, "file not found");
	}

	const ext = extOf(abs);
	if (!isSupportedExtension(ext)) {
		throw new UnsupportedFileTypeError(
			abs,
			`extension ${ext || "(none)"} not in ${[...SUPPORTED_EXT].join(",")}`,
		);
	}

	if (abs.endsWith(".original.md")) {
		throw new UnsupportedFileTypeError(abs, "path looks like a backup file");
	}

	const backupPath = backupPathFor(abs);
	if (existsSync(backupPath)) {
		throw new BackupExistsError(backupPath);
	}

	const buf = readFileSync(abs);
	if (buf.byteLength > MAX_BYTES) {
		throw new FileTooLargeError(abs, buf.byteLength);
	}

	return { abs, backupPath, content: buf.toString("utf8") };
}

// Move `abs` → `backupPath` and write `compressed` to `abs`. Caller must have
// already confirmed the backup path is free (resolveForCompression does this).
export function writeWithBackup(abs: string, backupPath: string, compressed: string): void {
	renameSync(abs, backupPath);
	writeFileSync(abs, compressed, "utf8");
}

// Restore `abs` from its backup. Throws if no backup exists.
export function restoreFromBackup(abs: string): { backupPath: string } {
	const backupPath = backupPathFor(abs);
	if (!existsSync(backupPath)) {
		const e = new Error(`ultra-compress: no backup at ${backupPath}`);
		e.name = "NoBackupError";
		throw e;
	}
	const content = readFileSync(backupPath, "utf8");
	writeFileSync(abs, content, "utf8");
	unlinkSync(backupPath);
	return { backupPath };
}
