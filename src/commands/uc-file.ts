import { existsSync } from "node:fs";
import { basename } from "node:path";
import { backupPathFor } from "../services/backup-path";
import { extOf, isSupportedExtension } from "../services/file-ops";
import { buildLevelPromptFragment } from "../services/level-prompts";
import { completePath } from "../services/path-complete";
import { safeResolveInCwd } from "../services/path-guard";
import {
	ACTIVE_LEVELS,
	type ActiveLevel,
	BackupExistsError,
	InvalidLevelError,
	UnsupportedFileTypeError,
} from "../types";
import type { AutocompleteItem, CommandDefinition } from "./types";

export interface UcFileDeps {
	// Injects a user message into the current session, triggering the agent.
	sendUserMessage: (prompt: string) => void;
	cwd?: string;
}

function isActiveLevel(s: string): s is ActiveLevel {
	return (ACTIVE_LEVELS as readonly string[]).includes(s);
}

function parseArgs(args: string): { path: string; level: string; yes: boolean } {
	const parts = args
		.trim()
		.split(/\s+/)
		.filter((p) => p.length > 0);
	const yes = parts.includes("--yes");
	const filtered = parts.filter((p) => p !== "--yes");
	return {
		path: filtered[0] ?? "",
		level: filtered[1] ?? "",
		yes,
	};
}

function buildPreviewPrompt(absPath: string, level: ActiveLevel): string {
	const rules = buildLevelPromptFragment(level, "file");
	return `I want a PREVIEW of compressing \`${absPath}\` to level \`${level}\` — do not write anything yet.

${rules}

Steps:
1. Read the file at \`${absPath}\`.
2. Apply the level-${level} rules above to its contents.
3. Show me the compressed version inside a fenced code block.
4. Report the character count: before → after, percentage saved.
5. Do NOT edit or write the file. If I approve, I'll re-run with \`--yes\` to write.`;
}

function buildWritePrompt(absPath: string, level: ActiveLevel, backupPath: string): string {
	const rules = buildLevelPromptFragment(level, "file");
	return `Compress \`${absPath}\` to level \`${level}\` and write the result.

${rules}

Steps (do in this order):
1. Read the file at \`${absPath}\`.
2. Copy the original to \`${backupPath}\` first via Bash: \`cp "${absPath}" "${backupPath}"\`.
3. Apply the level-${level} rules above to produce the compressed content.
4. Write the compressed content to \`${absPath}\` via Edit/Write (replacing the original).
5. Confirm backup exists and report: character count before → after, percentage saved.

Do NOT wrap the compressed output in a markdown code fence in the written file. Write the bare compressed body.`;
}

export function createUcFileCommand(deps: UcFileDeps): CommandDefinition {
	return {
		name: "uc-file",
		description:
			"Compress a markdown file to a given level (preview by default, --yes writes with backup). Delegates to the agent.",

		// PI replaces the ENTIRE args prefix with the selected value. So every
		// AutocompleteItem.value must be the full reconstructed args string up to
		// and including the completion.
		getArgumentCompletions(prefix: string): AutocompleteItem[] | null {
			const trimmed = prefix ?? "";
			const parts = trimmed.split(/\s+/);
			const endsWithSpace = /\s$/.test(trimmed);

			// Position 2: completing the level. Path already typed (parts[0]).
			if (parts.length >= 2 || (parts.length === 1 && endsWithSpace && parts[0])) {
				const pathPart = parts[0] ?? "";
				const levelPartial =
					endsWithSpace && parts.length === 1 ? "" : (parts[parts.length - 1] ?? "");
				const items = ACTIVE_LEVELS.filter((l) => l.startsWith(levelPartial)).map<AutocompleteItem>(
					(l) => ({
						value: `${pathPart} ${l}`,
						label: l,
					}),
				);
				return items.length > 0 ? items : null;
			}

			// Position 1: path completion with nested-directory support.
			const baseDir = deps.cwd ?? process.cwd();
			const pathPartial = parts[0] ?? "";
			const candidates = completePath(pathPartial, baseDir);
			if (candidates.length === 0) return null;
			return candidates.map<AutocompleteItem>((c) => ({ value: c, label: c }));
		},

		async handler(args, ctx) {
			const { path, level, yes } = parseArgs(args);

			if (!isActiveLevel(level)) {
				ctx.ui.notify(new InvalidLevelError(level).message, "error");
				return;
			}

			let abs: string;
			try {
				abs = safeResolveInCwd(path, ctx.cwd);
			} catch (e: unknown) {
				ctx.ui.notify((e as Error).message, "error");
				return;
			}

			if (!existsSync(abs)) {
				ctx.ui.notify(`ultra-compress: file not found "${abs}"`, "error");
				return;
			}

			const ext = extOf(abs);
			if (!isSupportedExtension(ext)) {
				ctx.ui.notify(
					new UnsupportedFileTypeError(abs, `extension "${ext}" not supported`).message,
					"error",
				);
				return;
			}

			if (abs.endsWith(".original.md")) {
				ctx.ui.notify(
					new UnsupportedFileTypeError(abs, "path looks like a backup file").message,
					"error",
				);
				return;
			}

			const backupPath = backupPathFor(abs);
			if (existsSync(backupPath)) {
				ctx.ui.notify(new BackupExistsError(backupPath).message, "error");
				return;
			}

			const prompt = yes
				? buildWritePrompt(abs, level, backupPath)
				: buildPreviewPrompt(abs, level);

			ctx.ui.notify(
				`ultra-compress: delegating ${yes ? "write" : "preview"} of ${basename(abs)} at ${level} to the agent...`,
				"info",
			);
			deps.sendUserMessage(prompt);
		},
	};
}
