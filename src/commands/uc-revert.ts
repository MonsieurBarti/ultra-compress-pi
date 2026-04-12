import { existsSync } from "node:fs";
import { backupPathFor } from "../services/backup-path";
import { restoreFromBackup } from "../services/file-ops";
import { completePath } from "../services/path-complete";
import { PathEscapeError, SymlinkRejectedError, safeResolveInCwd } from "../services/path-guard";
import type { AutocompleteItem, CommandDefinition } from "./types";

export interface UcRevertDeps {
	cwd?: string;
}

export function createUcRevertCommand(deps: UcRevertDeps = {}): CommandDefinition {
	return {
		name: "uc-revert",
		description: "Restore a file from its ultra-compress .original.md backup.",
		getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
			const trimmed = prefix ?? "";
			const parts = trimmed.split(/\s+/);
			const baseDir = deps.cwd ?? process.cwd();
			const partial = parts[0] ?? "";
			// Show only files whose backup exists — only revertable paths.
			const candidates = completePath(partial, baseDir, (absPath) =>
				existsSync(backupPathFor(absPath)),
			);
			if (candidates.length === 0) return null;
			return candidates.map<AutocompleteItem>((c) => ({ value: c, label: c }));
		},
		async handler(args, ctx) {
			const path = args.trim();
			if (!path) {
				ctx.ui.notify("ultra-compress: usage: /uc-revert <path>", "error");
				return;
			}
			let abs: string;
			try {
				abs = safeResolveInCwd(path, ctx.cwd);
			} catch (e) {
				if (e instanceof PathEscapeError || e instanceof SymlinkRejectedError) {
					ctx.ui.notify((e as Error).message, "error");
					return;
				}
				throw e;
			}
			try {
				restoreFromBackup(abs);
			} catch (e) {
				if ((e as Error).name === "NoBackupError") {
					ctx.ui.notify((e as Error).message, "error");
					return;
				}
				throw e;
			}
			ctx.ui.notify(`ultra-compress: restored ${abs} from backup.`, "info");
		},
	};
}
