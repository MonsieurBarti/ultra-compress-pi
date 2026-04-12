import { PIContextRequiredError } from "../types";
import type { LLMCall } from "./compress-pipeline";

interface PiModelRegistry {
	find(provider: string, model: string): unknown;
	getApiKeyAndHeaders(model: unknown): Promise<{ apiKey: string; headers: Record<string, string> }>;
}

export interface LLMFactoryContext {
	modelRegistry?: PiModelRegistry;
	signal?: AbortSignal;
}

// Build a live LLMCall bound to the PI session's default model. Throws
// PIContextRequiredError when invoked outside a live PI runtime (no registry).
export function makeLLM(piCtx: LLMFactoryContext): LLMCall {
	return async (prompt, signal) => {
		if (!piCtx.modelRegistry) throw new PIContextRequiredError();
		const mod = await import("@mariozechner/pi-ai");
		const complete = (
			mod as {
				complete: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text?: string }> }>;
			}
		).complete;
		const model = piCtx.modelRegistry.find("", "");
		const auth = await piCtx.modelRegistry.getApiKeyAndHeaders(model);
		const resp = await complete(
			model,
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
