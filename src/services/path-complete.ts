import { type Dirent, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { extOf, isSupportedExtension } from "./file-ops";

export type CompletionFilter = (absPath: string, name: string) => boolean;

// Nested-path completion for .md/.txt/.rst/.markdown files.
// - Splits `partial` into (dirPart, tail); reads the directory.
// - Returns subdirectories with a trailing "/" (so tab-completion can drill in)
//   and matching files.
// - Dotfiles/dotdirs and *.original.md backups are always skipped.
// - Optional `fileFilter`: called for each candidate file (by absolute path and
//   name); only files returning true are included. Directories are unaffected.
export function completePath(
	partial: string,
	baseDir: string,
	fileFilter?: CompletionFilter,
): string[] {
	let dirPart: string;
	let tail: string;
	const lastSep = partial.lastIndexOf("/");
	if (lastSep === -1) {
		dirPart = "";
		tail = partial;
	} else {
		dirPart = partial.slice(0, lastSep + 1);
		tail = partial.slice(lastSep + 1);
	}

	const searchDir = dirPart === "" ? resolve(baseDir) : resolve(baseDir, dirPart);

	let entries: Dirent<string>[];
	try {
		entries = readdirSync(searchDir, { withFileTypes: true, encoding: "utf8" });
	} catch {
		return [];
	}

	const results: string[] = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		if (!entry.name.startsWith(tail)) continue;
		if (entry.isDirectory()) {
			results.push(`${dirPart}${entry.name}/`);
			continue;
		}
		if (entry.isFile()) {
			if (!isSupportedExtension(extOf(entry.name))) continue;
			if (entry.name.endsWith(".original.md")) continue;
			if (fileFilter) {
				const absPath = resolve(searchDir, entry.name);
				if (!fileFilter(absPath, entry.name)) continue;
			}
			results.push(`${dirPart}${entry.name}`);
		}
	}
	return results.sort();
}
