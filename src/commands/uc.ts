import { saveLevel } from "../services/state-store.js";
import { ALL_LEVELS, InvalidLevelError, type Level } from "../types.js";
import type { AutocompleteItem, CommandDefinition } from "./types.js";

function isLevel(s: string): s is Level {
	return (ALL_LEVELS as readonly string[]).includes(s);
}

export function createUcCommand(): CommandDefinition {
	return {
		name: "uc",
		description:
			"Set the ultra-compress level for this project (off|lite|standard|ultra|symbolic).",
		getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
			const items = ALL_LEVELS.filter((l) => l.startsWith(prefix)).map((l) => ({
				value: l,
				label: l,
			}));
			return items.length > 0 ? items : null;
		},
		async handler(args, ctx) {
			const level = args.trim();
			if (!level) {
				ctx.ui.notify("ultra-compress: usage: /uc <off|lite|standard|ultra|symbolic>", "error");
				return;
			}
			if (!isLevel(level)) {
				ctx.ui.notify(new InvalidLevelError(level).message, "error");
				return;
			}
			await saveLevel(level, ctx.cwd);
			ctx.ui.notify(`ultra-compress → ${level}`, "info");
		},
	};
}
