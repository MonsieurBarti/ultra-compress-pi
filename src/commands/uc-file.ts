import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { compressTextPipeline } from "../services/compress-pipeline";
import {
	extOf,
	isSupportedExtension,
	resolveForCompression,
	writeWithBackup,
} from "../services/file-ops";
import { PathEscapeError, SymlinkRejectedError } from "../services/path-guard";
import { appendCompressedFile } from "../services/state-store";
import {
	ACTIVE_LEVELS,
	type ActiveLevel,
	BackupExistsError,
	FileTooLargeError,
	InvalidLevelError,
	UnsupportedFileTypeError,
} from "../types";
import type { AutocompleteItem, CommandContext, CommandDefinition } from "./types";

export interface UcFileDeps {
	llm: (ctx: CommandContext) => import("../services/compress-pipeline").LLMCall;
	cwd?: string;
}

function isActiveLevel(s: string): s is ActiveLevel {
	return (ACTIVE_LEVELS as readonly string[]).includes(s);
}

function parseArgs(args: string): { path: string; level: string; yes: boolean } {
	const parts = args.trim().split(/\s+/);
	const yes = parts.includes("--yes");
	const filtered = parts.filter((p) => p !== "--yes");
	return {
		path: filtered[0] ?? "",
		level: filtered[1] ?? "",
		yes,
	};
}

export function createUcFileCommand(deps: UcFileDeps): CommandDefinition {
	return {
		name: "uc-file",
		description: "Compress a markdown file to a given level (preview → write with backup).",
		getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
			const parts = prefix.split(/\s+/);
			if (parts.length >= 2) {
				const levelPrefix = parts[parts.length - 1] ?? "";
				const items = ACTIVE_LEVELS.filter((l) => l.startsWith(levelPrefix)).map((l) => ({
					value: l,
					label: l,
				}));
				return items.length > 0 ? items : null;
			}
			try {
				const cwd = deps.cwd ?? process.cwd();
				const entries = readdirSync(cwd, { withFileTypes: true });
				const files = entries
					.filter((e) => e.isFile() && isSupportedExtension(extOf(e.name)))
					.map((e) => join(cwd, e.name))
					.filter((p) => p.startsWith(join(cwd, parts[0] ?? "")));
				return files.length > 0 ? files.map((f) => ({ value: f, label: basename(f) })) : null;
			} catch {
				return null;
			}
		},
		async handler(args, ctx) {
			const { path, level, yes } = parseArgs(args);

			if (!isActiveLevel(level)) {
				ctx.ui.notify(new InvalidLevelError(level).message, "error");
				return;
			}

			let abs: string;
			let backupPath: string;
			let input: string;
			try {
				({ abs, backupPath, content: input } = resolveForCompression(path, ctx.cwd));
			} catch (e) {
				if (
					e instanceof PathEscapeError ||
					e instanceof SymlinkRejectedError ||
					e instanceof UnsupportedFileTypeError ||
					e instanceof BackupExistsError ||
					e instanceof FileTooLargeError
				) {
					ctx.ui.notify((e as Error).message, "error");
					return;
				}
				throw e;
			}

			const llm = deps.llm(ctx);

			let result: Awaited<ReturnType<typeof compressTextPipeline>>;
			try {
				result = await compressTextPipeline({
					input,
					level,
					mode: "file",
					llm,
				});
			} catch (e: unknown) {
				ctx.ui.notify(`ultra-compress: ${(e as Error).message}`, "error");
				return;
			}

			if (!yes) {
				const pct = Math.round(result.ratio * 100);
				ctx.ui.notify(
					`ultra-compress preview: ${input.length} → ${result.compressed.length} (${pct}% saved). Re-run with --yes to write.`,
					"info",
				);
				if (result.warnings.length > 0) {
					ctx.ui.notify(`warnings: ${result.warnings.join(" | ")}`, "warning");
				}
				return;
			}

			writeWithBackup(abs, backupPath, result.compressed);
			await appendCompressedFile(
				{
					path: abs,
					level,
					before: input.length,
					after: result.compressed.length,
					at: new Date().toISOString(),
				},
				ctx.cwd,
			);
			ctx.ui.notify(`ultra-compress: compressed and written. Backup at ${backupPath}.`, "info");
		},
	};
}
