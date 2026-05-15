import { compactSessionVcc } from "../services/vcc-compaction-engine.js";
import { normalizeSessionEntries } from "../services/session-normalizer.js";
import { readSessionEntries, resolveSessionJsonlPath } from "../services/session-reader.js";
import type { CommandDefinition } from "./types.js";

export function createUcVccCommand(): CommandDefinition {
	return {
		name: "uc-vcc",
		description:
			"Manually trigger deterministic VCC session compaction and display the structured summary.",
		async handler(_args, ctx) {
			const path =
				ctx.sessionManager?.getSessionFile() ?? resolveSessionJsonlPath({ projectRoot: ctx.cwd });
			if (!path) {
				ctx.ui.notify("ultra-compact: no session JSONL found", "warning");
				return;
			}
			const entries = await readSessionEntries(path);
			if (entries.length === 0) {
				ctx.ui.notify("ultra-compact: session is empty — nothing to compact", "info");
				return;
			}
			const messages = normalizeSessionEntries(entries);
			const summary = compactSessionVcc(messages);
			ctx.ui.notify(summary, "info");
		},
	};
}
