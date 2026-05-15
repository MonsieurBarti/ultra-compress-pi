import { describe, expect, it, vi } from "vitest";
import { extractSections } from "../../src/services/compaction-engine.js";

describe("llm goal enhancer", () => {
	it("uses enhanced goal when callback succeeds", async () => {
		const messages = [{ role: "user" as const, content: "Build a feature" }];
		const enhanced = vi.fn().mockResolvedValue("Enhanced: Build session compaction");
		const sections = await extractSections(messages, { enhanceGoal: enhanced });
		expect(sections.goal).toBe("Enhanced: Build session compaction");
		expect(enhanced).toHaveBeenCalledWith(messages);
	});

	it("falls back to algorithmic goal when callback throws", async () => {
		const messages = [{ role: "user" as const, content: "Build a feature" }];
		const enhanced = vi.fn().mockRejectedValue(new Error("LLM unavailable"));
		const sections = await extractSections(messages, { enhanceGoal: enhanced });
		expect(sections.goal).toBe("Build a feature");
	});

	it("falls back when callback returns empty string", async () => {
		const messages = [{ role: "user" as const, content: "Build a feature" }];
		const enhanced = vi.fn().mockResolvedValue("   ");
		const sections = await extractSections(messages, { enhanceGoal: enhanced });
		expect(sections.goal).toBe("Build a feature");
	});

	it("skips enhancement when no callback provided", async () => {
		const messages = [{ role: "user" as const, content: "Build a feature" }];
		const sections = await extractSections(messages);
		expect(sections.goal).toBe("Build a feature");
	});
});
