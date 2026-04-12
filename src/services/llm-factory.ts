import { LLMAuthError, PIContextRequiredError } from "../types";
import type { LLMCall } from "./compress-pipeline";

interface PiModelRegistry {
	find(provider: string, model: string): unknown;
	getApiKeyAndHeaders(model: unknown): Promise<{
		ok: boolean;
		apiKey?: string;
		headers: Record<string, string>;
		error?: string;
	}>;
}

export interface LLMFactoryContext {
	model: unknown; // active session model from ctx.model
	modelRegistry?: PiModelRegistry;
	signal?: AbortSignal;
}

// Build a live LLMCall bound to the PI session's active model (ctx.model).
// Throws PIContextRequiredError when invoked outside a live PI runtime
// (no registry or no model). Throws LLMAuthError when auth fails.
export function makeLLM(piCtx: LLMFactoryContext): LLMCall {
	return async (prompt, signal) => {
		if (!piCtx.modelRegistry || piCtx.model === undefined || piCtx.model === null) {
			throw new PIContextRequiredError();
		}
		const mod = await import("@mariozechner/pi-ai");
		const complete = (
			mod as {
				complete: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text?: string }> }>;
			}
		).complete;
		const auth = await piCtx.modelRegistry.getApiKeyAndHeaders(piCtx.model);
		if (!auth.ok || !auth.apiKey) {
			throw new LLMAuthError(auth.error ?? "no API key for active model");
		}
		const resp = await complete(
			piCtx.model,
			{ messages: [{ role: "user", content: prompt }] },
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				maxTokens: 8192,
				signal: signal ?? piCtx.signal,
			},
		);
		return resp.content
			.filter((c) => c.type === "text")
			.map((c) => c.text ?? "")
			.join("");
	};
}
