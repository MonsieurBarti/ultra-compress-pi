import { describe, expect, it, vi } from "vitest";
import { compressTextPipeline } from "../../src/services/compress-pipeline";
import type { LLMCall } from "../../src/services/compress-pipeline";

function makeLLM(sequence: string[]): LLMCall {
	let i = 0;
	return vi.fn(async () => {
		const out = sequence[i] ?? sequence[sequence.length - 1] ?? "";
		i++;
		return out;
	});
}

describe("compressTextPipeline", () => {
	it("returns compressed output when LLM respects protected tokens", async () => {
		const input = "The quick brown fox. See https://example.com.";
		const llm = makeLLM(["Fox quick. See ⟨PROT:0⟩."]);
		const result = await compressTextPipeline({
			input,
			level: "standard",
			mode: "file",
			llm,
		});
		expect(result.compressed).toContain("https://example.com");
		expect(result.before).toBe(input.length);
		expect(result.after).toBe(result.compressed.length);
		expect(result.ratio).toBeGreaterThan(0);
	});

	it("runs a repair retry when validator fails, succeeds on retry", async () => {
		const input = "alpha https://a.com\nbravo https://b.com";
		const llm = makeLLM(["alpha ⟨PROT:0⟩\nbravo", "alpha ⟨PROT:0⟩\nbravo ⟨PROT:1⟩"]);
		const result = await compressTextPipeline({
			input,
			level: "standard",
			mode: "file",
			llm,
			maxRepairRetries: 2,
		});
		expect(result.compressed).toContain("https://a.com");
		expect(result.compressed).toContain("https://b.com");
		expect(llm).toHaveBeenCalledTimes(2);
	});

	it("throws ValidatorFailedError after max retries exhausted", async () => {
		const input = "alpha https://a.com";
		const llm = makeLLM(["alpha", "alpha", "alpha"]);
		await expect(
			compressTextPipeline({
				input,
				level: "standard",
				mode: "file",
				llm,
				maxRepairRetries: 2,
			}),
		).rejects.toThrow("validator failed");
	});

	it("strips an outer markdown code fence if LLM wraps output", async () => {
		const input = "The foo.";
		const llm = makeLLM(["```markdown\nFoo.\n```"]);
		const result = await compressTextPipeline({
			input,
			level: "standard",
			mode: "file",
			llm,
		});
		expect(result.compressed).toBe("Foo.");
	});
});
