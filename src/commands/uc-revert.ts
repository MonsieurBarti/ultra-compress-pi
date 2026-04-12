import { restoreFromBackup } from "../services/file-ops";
import { PathEscapeError, SymlinkRejectedError, safeResolveInCwd } from "../services/path-guard";
import type { CommandDefinition } from "./types";

export function createUcRevertCommand(): CommandDefinition {
	return {
		name: "uc-revert",
		description: "Restore a file from its ultra-compress .original.md backup.",
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
