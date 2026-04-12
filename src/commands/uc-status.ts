import { basename } from "node:path";
import { loadState } from "../services/state-store";
import type { CommandDefinition } from "./types";

export function createUcStatusCommand(): CommandDefinition {
	return {
		name: "uc-status",
		description: "Show ultra-compress active level and session stats.",
		async handler(_args, ctx) {
			const state = await loadState(ctx.cwd);
			const last = state.session.filesCompressed.slice(-5);
			const lastStr =
				last.length === 0
					? "none"
					: last
							.map((f) => {
								const pct = Math.round(((f.before - f.after) / f.before) * 100);
								return `${basename(f.path)} (${f.level} ${pct}%)`;
							})
							.join(", ");
			const msg =
				`ultra-compress: ${state.level} · ` +
				`session started ${state.session.startedAt} · ` +
				`~${state.session.estimatedOutputCharsSaved} chars saved · ` +
				`auto-clarity ${state.session.autoClarityCount}× · ` +
				`recent files: ${lastStr}`;
			ctx.ui.notify(msg, "info");
		},
	};
}
