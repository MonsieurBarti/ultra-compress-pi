import { ensureSessionCompactConfig } from "../services/session-config.js";
import { loadState, resetSessionStats } from "../services/state-store.js";

export interface SessionStartEvent {
	reason: "startup" | "reload" | "new" | "resume" | "fork";
}

export interface SessionStartContext {
	cwd: string;
}

export type NotifyFn = (message: string, level?: "info" | "warning" | "error") => void;

export interface SessionStartDeps {
	notify: NotifyFn;
}

export type SessionStartHook = (
	event: SessionStartEvent,
	ctx: SessionStartContext,
) => Promise<void>;

export function createSessionStartHook(deps: SessionStartDeps): SessionStartHook {
	return async function onSessionStart(_event, ctx) {
		const before = await loadState(ctx.cwd);
		await resetSessionStats(ctx.cwd);
		await ensureSessionCompactConfig(ctx.cwd);
		if (before.level !== "off") {
			deps.notify(`ultra-compress: ${before.level} (per-project)`, "info");
		}
	};
}
