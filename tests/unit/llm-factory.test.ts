import { describe, expect, it } from "vitest";
import { makeLLM } from "../../src/services/llm-factory";
import { LLMAuthError, PIContextRequiredError } from "../../src/types";

describe("makeLLM", () => {
	it("throws PIContextRequiredError when modelRegistry is missing", async () => {
		const call = makeLLM({ model: {} });
		await expect(call("prompt")).rejects.toThrow(PIContextRequiredError);
	});

	it("throws PIContextRequiredError when model is missing", async () => {
		const call = makeLLM({
			model: undefined as unknown as object,
			modelRegistry: {
				find: () => ({}),
				getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "x", headers: {} }),
			},
		});
		await expect(call("prompt")).rejects.toThrow(PIContextRequiredError);
	});

	it("throws LLMAuthError when auth.ok is false", async () => {
		const call = makeLLM({
			model: { provider: "anthropic", name: "test" },
			modelRegistry: {
				find: () => ({}),
				getApiKeyAndHeaders: async () => ({
					ok: false,
					headers: {},
					error: "ANTHROPIC_API_KEY not set",
				}),
			},
		});
		await expect(call("prompt")).rejects.toThrow(LLMAuthError);
		await expect(call("prompt")).rejects.toThrow(/ANTHROPIC_API_KEY not set/);
	});
});
