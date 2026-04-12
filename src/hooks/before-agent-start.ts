import { loadState } from "../services/state-store.js";

export interface BeforeAgentStartEvent {
	prompt: string;
	systemPrompt: string;
}

export interface BeforeAgentStartContext {
	cwd: string;
}

export interface BeforeAgentStartResult {
	systemPrompt: string;
}

export type BeforeAgentStartHook = (
	event: BeforeAgentStartEvent,
	ctx: BeforeAgentStartContext,
) => Promise<BeforeAgentStartResult | undefined>;

export function createBeforeAgentStartHook(): BeforeAgentStartHook {
	return async function onBeforeAgentStart(event, ctx) {
		const state = await loadState(ctx.cwd);
		if (state.level === "off") return undefined;
		const marker = `\n\n[ultra-compress: LEVEL=${state.level}. Apply §${state.level} rules from ultra-compress skill. Auto-Clarity: fall back to prose for destructive/security/ordered turns.]`;
		return { systemPrompt: event.systemPrompt + marker };
	};
}
