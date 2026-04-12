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
					const piCtx = ctx as PiCommandContext;
					const factoryCtx: LLMFactoryContext = {};
					if (piCtx.modelRegistry !== undefined) factoryCtx.modelRegistry = piCtx.modelRegistry;
					if (piCtx.signal !== undefined) factoryCtx.signal = piCtx.signal;
					return makeLLM(factoryCtx);
				},
			}),
		),
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

export type CtxLike = LLMFactoryContext & { cwd?: string };

export async function compressText(
	input: string,
	level: ActiveLevel,
	ctx: CtxLike,
	opts?: CompressOptions,
): Promise<CompressResult> {
	const factoryCtx: LLMFactoryContext = {};
	if (ctx.modelRegistry !== undefined) factoryCtx.modelRegistry = ctx.modelRegistry;
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
