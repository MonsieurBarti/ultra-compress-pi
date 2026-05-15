import { compactSession } from "../services/compaction-engine.js";
import { normalizeSessionEntries } from "../services/session-normalizer.js";
import { readSessionEntries, resolveSessionJsonlPath } from "../services/session-reader.js";
import type { CommandDefinition } from "./types.js";

export function createUcCompactCommand(): CommandDefinition {
	return {
		name: "uc-compact",
		description:
			"Manually trigger algorithmic session compaction and display the structured summary.",
		async handler(_args, ctx) {
			const path = resolveSessionJsonlPath({ projectRoot: ctx.cwd });
			if (!path) {
				ctx.ui.notify("ultra-compact: no session JSONL found at .pi/session.jsonl", "warning");
				return;
			}
			const entries = await readSessionEntries(path);
			if (entries.length === 0) {
				ctx.ui.notify("ultra-compact: session is empty — nothing to compact", "info");
				return;
			}
			const messages = normalizeSessionEntries(entries);
			const summary = await compactSession(messages);
			ctx.ui.notify(summary, "info");
		},
	};
}
