import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
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
			const abs = resolve(ctx.cwd, path);
			const ext = abs.slice(abs.lastIndexOf("."));
			const backup = `${abs}.original${ext}`;
			if (!existsSync(backup)) {
				ctx.ui.notify(`ultra-compress: no backup at ${backup}`, "error");
				return;
			}
			const content = readFileSync(backup, "utf8");
			writeFileSync(abs, content, "utf8");
			unlinkSync(backup);
			ctx.ui.notify(`ultra-compress: restored ${abs} from backup.`, "info");
		},
	};
}
