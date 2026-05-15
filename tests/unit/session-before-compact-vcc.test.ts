import { describe, expect, it } from "vitest";
import { createSessionBeforeCompactHook } from "../../src/hooks/session-before-compact.js";

describe("session_before_compact vcc branch", () => {
	const makePreparation = (overrides = {}) => ({
		firstKeptEntryId: "entry-1",
		messagesToSummarize: [],
		turnPrefixMessages: [],
		isSplitTurn: false,
		tokensBefore: 1000,
		fileOps: { operations: [] },
		settings: { enabled: true, reserveTokens: 100, keepRecentTokens: 50 },
		...overrides,
	});

	it("returns undefined when overrideDefaultCompaction is false", async () => {
		const hook = createSessionBeforeCompactHook({
			loadConfig: async () => ({
				overrideDefaultCompaction: false,
				useLLMForGoal: false,
				updatedAt: new Date().toISOString(),
			}),
		});
		const result = await hook(makePreparation());
		expect(result).toBeUndefined();
	});

	it("uses vcc branch when useVccPipeline is true", async () => {
		const hook = createSessionBeforeCompactHook({
			loadConfig: async () => ({
				overrideDefaultCompaction: true,
				useLLMForGoal: false,
				useVccPipeline: true,
				updatedAt: new Date().toISOString(),
			}),
		});
		const result = await hook(makePreparation());
		expect(result).toBeDefined();
		expect(result?.compaction?.details).toMatchObject({ vcc: true, algorithmic: true });
		expect(result?.compaction?.summary).toContain("[Goal]");
		expect(result?.compaction?.summary).toContain("[VCC Brief]");
	});

	it("uses legacy branch when useVccPipeline is false", async () => {
		const hook = createSessionBeforeCompactHook({
			loadConfig: async () => ({
				overrideDefaultCompaction: true,
				useLLMForGoal: false,
				useVccPipeline: false,
				updatedAt: new Date().toISOString(),
			}),
		});
		const result = await hook(makePreparation());
		expect(result).toBeDefined();
		expect(result?.compaction?.details).toEqual({ algorithmic: true });
	});

	it("merges previous summary in vcc branch", async () => {
		const hook = createSessionBeforeCompactHook({
			loadConfig: async () => ({
				overrideDefaultCompaction: true,
				useLLMForGoal: false,
				useVccPipeline: true,
				updatedAt: new Date().toISOString(),
			}),
		});
		const previousSummary =
			"[Goal]\nPrevious goal\n\n[Files & Changes]\nread: old.ts\n\n[User Preferences]\n- prefer dark mode\n\n[VCC Brief]\nNo entries";
		const messagesToSummarize = [
			{ role: "user", content: "Please use TypeScript for this project" },
		];
		const result = await hook(makePreparation({ previousSummary, messagesToSummarize }));
		// Current goal wins over previous
		expect(result?.compaction?.summary).toContain("use TypeScript");
		// Previous user preference is merged (sticky field)
		expect(result?.compaction?.summary).toContain("prefer dark mode");
	});

	it("handles vcc branch without previousSummary", async () => {
		const hook = createSessionBeforeCompactHook({
			loadConfig: async () => ({
				overrideDefaultCompaction: true,
				useLLMForGoal: false,
				useVccPipeline: true,
				updatedAt: new Date().toISOString(),
			}),
		});
		const messagesToSummarize = [{ role: "user", content: "Build the login feature" }];
		const result = await hook(makePreparation({ messagesToSummarize, previousSummary: undefined }));
		expect(result).toBeDefined();
		expect(result?.compaction?.summary).toContain("Build the login feature");
		expect(result?.compaction?.details).toMatchObject({ vcc: true });
	});
});
