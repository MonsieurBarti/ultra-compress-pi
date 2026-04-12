import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type CommandContext,
	type CommandDefinition,
	createUcCommand,
	createUcFileCommand,
	createUcRevertCommand,
	createUcStatusCommand,
} from "./commands";
import { createBeforeAgentStartHook, createSessionStartHook } from "./hooks";
import { type LLMCall, compressTextPipeline } from "./services/compress-pipeline";
import { applyLevelLexical } from "./services/level-rules";
import { loadState } from "./services/state-store";
import {
	type ActiveLevel,
	type CompressOptions,
	type CompressResult,
	type Level,
	PIContextRequiredError,
} from "./types";

// Structural PI API (inlined to avoid requiring peer deps at test time).

type PiEventHandler = (event: unknown, ctx: unknown) => unknown | Promise<unknown>;

interface PiRegisteredCommand {
	description?: string;
	getArgumentCompletions?(prefix: string): Array<{ value: string; label: string }> | null;
	handler(args: string, ctx: PiCommandContext): Promise<void>;
}

interface PiCommandContext {
	ui?: { notify?: (message: string, level?: string) => void };
	cwd?: string;
	modelRegistry?: PiModelRegistry;
	signal?: AbortSignal;
}

interface PiModelRegistry {
	find(provider: string, model: string): unknown;
	getApiKeyAndHeaders(model: unknown): Promise<{ apiKey: string; headers: Record<string, string> }>;
}

export interface PiExtensionApi {
	on(event: string, handler: PiEventHandler): void;
	registerCommand(name: string, config: PiRegisteredCommand): void;
	cwd?: string;
}

function wrapCommand(def: CommandDefinition): PiRegisteredCommand {
	return {
		description: def.description,
		...(def.getArgumentCompletions ? { getArgumentCompletions: def.getArgumentCompletions } : {}),
		async handler(args, piCtx) {
			const ctx: CommandContext = {
				cwd: piCtx.cwd ?? process.cwd(),
				ui: {
					notify: (message, level = "info") => {
						piCtx.ui?.notify?.(message, level);
					},
				},
			};
			await def.handler(args, ctx);
		},
	};
}

// Build a live LLMCall bound to the PI session's default model.
// If the model registry is not available on the context, throw PIContextRequiredError.
function makeLLM(piCtx: PiCommandContext): LLMCall {
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

export default function ultraCompressExtension(pi: PiExtensionApi): void {
	const notify = (message: string, level: "info" | "warning" | "error" = "info") => {
		process.stderr.write(`[ultra-compress] ${level}: ${message}\n`);
	};

	pi.registerCommand("uc", wrapCommand(createUcCommand()));
	pi.registerCommand(
		"uc-file",
		wrapCommand(createUcFileCommand({ llm: (ctx) => makeLLM(ctx as PiCommandContext) })),
	);
	pi.registerCommand("uc-status", wrapCommand(createUcStatusCommand()));
	pi.registerCommand("uc-revert", wrapCommand(createUcRevertCommand()));

	const sessionStart = createSessionStartHook({ notify });
	const beforeAgentStart = createBeforeAgentStartHook();

	pi.on("session_start", async (event, ctx) => {
		const e = event as { reason?: string };
		const c = ctx as { cwd?: string };
		if (typeof c?.cwd !== "string") return;
		await sessionStart({ reason: (e?.reason as "startup") ?? "startup" }, { cwd: c.cwd });
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const e = event as { prompt?: string; systemPrompt?: string };
		const c = ctx as { cwd?: string };
		if (typeof e?.prompt !== "string" || typeof e?.systemPrompt !== "string") return;
		if (typeof c?.cwd !== "string") return;
		return await beforeAgentStart(
			{ prompt: e.prompt, systemPrompt: e.systemPrompt },
			{ cwd: c.cwd },
		);
	});

	const extensionDir = dirname(fileURLToPath(import.meta.url));
	const skillsDir = join(extensionDir, "skills");
	pi.on("resources_discover", () => ({ skills: [skillsDir] }));
}

// Named library exports for other PI extensions.

export type {
	ActiveLevel,
	CompressOptions,
	CompressResult,
	Level,
	Mode,
} from "./types";
export { PIContextRequiredError } from "./types";
export {
	buildLevelPromptFragment,
	applyLevelLexical,
	maskProtectedZones,
	unmaskProtectedZones,
	validateCompression,
	compressTextPipeline,
	levelFactor,
	estimateCharsSaved,
	loadState,
} from "./services";

export async function getActiveLevel(projectRoot?: string): Promise<Level> {
	const state = await loadState(projectRoot);
	return state.level;
}

export interface CtxLike {
	modelRegistry: PiModelRegistry;
	cwd?: string;
	signal?: AbortSignal;
}

export async function compressText(
	input: string,
	level: ActiveLevel,
	ctx: CtxLike,
	opts?: CompressOptions,
): Promise<CompressResult> {
	const llm = makeLLM({
		modelRegistry: ctx.modelRegistry,
		...(ctx.cwd !== undefined ? { cwd: ctx.cwd } : {}),
		...(ctx.signal !== undefined ? { signal: ctx.signal } : {}),
	});
	return compressTextPipeline({
		input,
		level,
		mode: "file",
		llm,
		...(opts?.maxRepairRetries !== undefined ? { maxRepairRetries: opts.maxRepairRetries } : {}),
		...(ctx.signal ? { signal: ctx.signal } : {}),
	});
}

export function compressTextLexical(
	input: string,
	level: ActiveLevel,
): { compressed: string; before: number; after: number } {
	const compressed = applyLevelLexical(input, level);
	return { compressed, before: input.length, after: compressed.length };
}
