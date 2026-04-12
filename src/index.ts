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
import { createAgentEndHook, createBeforeAgentStartHook, createSessionStartHook } from "./hooks";
import { compressTextPipeline } from "./services/compress-pipeline";
import { applyLevelLexical } from "./services/level-rules";
import { type LLMFactoryContext, makeLLM } from "./services/llm-factory";
import { loadState } from "./services/state-store";
import type { ActiveLevel, CompressOptions, CompressResult, Level } from "./types";

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
	model?: unknown;
	modelRegistry?: LLMFactoryContext["modelRegistry"];
	signal?: AbortSignal;
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
				...(piCtx.model !== undefined ? { model: piCtx.model } : {}),
				...(piCtx.modelRegistry !== undefined ? { modelRegistry: piCtx.modelRegistry } : {}),
				...(piCtx.signal !== undefined ? { signal: piCtx.signal } : {}),
			};
			await def.handler(args, ctx);
		},
	};
}

export default function ultraCompressExtension(pi: PiExtensionApi): void {
	const notify = (message: string, level: "info" | "warning" | "error" = "info") => {
		process.stderr.write(`[ultra-compress] ${level}: ${message}\n`);
	};

	pi.registerCommand("uc", wrapCommand(createUcCommand()));
	pi.registerCommand(
		"uc-file",
		wrapCommand(
			createUcFileCommand({
				llm: (ctx) => {
					const factoryCtx: LLMFactoryContext = { model: ctx.model };
					if (ctx.modelRegistry !== undefined) {
						(factoryCtx as { modelRegistry: unknown }).modelRegistry = ctx.modelRegistry;
					}
					if (ctx.signal !== undefined) {
						factoryCtx.signal = ctx.signal;
					}
					return makeLLM(factoryCtx);
				},
			}),
		),
	);
	pi.registerCommand("uc-status", wrapCommand(createUcStatusCommand()));
	pi.registerCommand("uc-revert", wrapCommand(createUcRevertCommand()));

	const sessionStart = createSessionStartHook({ notify });
	const beforeAgentStart = createBeforeAgentStartHook();
	const agentEnd = createAgentEndHook();

	pi.on("session_start", async (event, ctx) => {
		const e = event as { reason?: string };
		const c = ctx as { cwd?: string };
		if (typeof c?.cwd !== "string") return;
		await sessionStart({ reason: (e?.reason as "startup") ?? "startup" }, { cwd: c.cwd });
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const e = event as { prompt?: unknown; systemPrompt?: string };
		const c = ctx as { cwd?: string };
		if (typeof e?.systemPrompt !== "string") return undefined;
		if (typeof c?.cwd !== "string") return undefined;
		return await beforeAgentStart(
			{ prompt: typeof e.prompt === "string" ? e.prompt : "", systemPrompt: e.systemPrompt },
			{ cwd: c.cwd },
		);
	});

	pi.on("agent_end", async (event, ctx) => {
		const c = ctx as { cwd?: string };
		if (typeof c?.cwd !== "string") return;
		const e = event as { content?: unknown; stopReason?: string };
		await agentEnd(e, { cwd: c.cwd });
	});

	const extensionDir = dirname(fileURLToPath(import.meta.url));
	const skillsDir = join(extensionDir, "skills");
	pi.on("resources_discover", () => ({ skillPaths: [skillsDir] }));
}

// Named library exports for other PI extensions — public surface only (spec §9).

export type {
	ActiveLevel,
	CompressOptions,
	CompressResult,
	Level,
	Mode,
} from "./types";
export { PIContextRequiredError } from "./types";
export { buildLevelPromptFragment } from "./services/level-prompts";
export { validateCompression } from "./services/validator";

export async function getActiveLevel(projectRoot?: string): Promise<Level> {
	const state = await loadState(projectRoot);
	return state.level;
}

export interface CtxLike {
	model: unknown;
	modelRegistry: unknown; // no longer optional — if the caller has no registry, they can't call compressText
	cwd?: string;
	signal?: AbortSignal;
}

export async function compressText(
	input: string,
	level: ActiveLevel,
	ctx: CtxLike,
	opts?: CompressOptions,
): Promise<CompressResult> {
	const factoryCtx: LLMFactoryContext = { model: ctx.model };
	if (ctx.modelRegistry !== undefined) {
		(factoryCtx as { modelRegistry: unknown }).modelRegistry = ctx.modelRegistry;
	}
	if (ctx.signal !== undefined) factoryCtx.signal = ctx.signal;
	const llm = makeLLM(factoryCtx);
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
