import { lstatSync } from "node:fs";
import { resolve, sep } from "node:path";

export class PathEscapeError extends Error {
	constructor(given: string, root: string) {
		super(`ultra-compress: refusing to access "${given}" — escapes project root "${root}"`);
		this.name = "PathEscapeError";
	}
}

export class SymlinkRejectedError extends Error {
	constructor(path: string) {
		super(`ultra-compress: refusing to follow symlink at "${path}"`);
		this.name = "SymlinkRejectedError";
	}
}

// Resolve `input` against `cwd`, reject if the resolved path escapes cwd,
// and reject if any path component (the file itself) is a symlink.
export function safeResolveInCwd(input: string, cwd: string): string {
	const cwdAbs = resolve(cwd);
	const abs = resolve(cwdAbs, input);
	const prefix = cwdAbs.endsWith(sep) ? cwdAbs : cwdAbs + sep;
	if (abs !== cwdAbs && !abs.startsWith(prefix)) {
		throw new PathEscapeError(input, cwdAbs);
	}
	// lstat to detect symlinks without following them. Only checks the final
	// path; acceptable for v1 (callers can't plant a symlink they couldn't
	// already read/write via the OS). Skip if path doesn't exist (creation OK).
	try {
		const st = lstatSync(abs);
		if (st.isSymbolicLink()) throw new SymlinkRejectedError(abs);
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
			if (e instanceof SymlinkRejectedError) throw e;
			// other stat errors (EACCES etc.) are passed through
			throw e;
		}
	}
	return abs;
}
