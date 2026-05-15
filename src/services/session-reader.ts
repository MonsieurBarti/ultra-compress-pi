import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SessionEntry } from "../types/session-compact.js";

export interface ResolveOptions {
	explicitPath?: string;
	projectRoot?: string;
}

export function resolveSessionJsonlPath(options: ResolveOptions = {}): string | null {
	if (options.explicitPath) {
		if (existsSync(options.explicitPath)) return options.explicitPath;
		return null;
	}

	const root = options.projectRoot ?? process.cwd();
	const candidates = [
		join(root, ".pi", "session.jsonl"),
		join(root, ".pi", "sessions", "latest.jsonl"),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}

	return null;
}

export async function readSessionEntries(path: string): Promise<SessionEntry[]> {
	if (!existsSync(path)) return [];

	const raw = await readFile(path, "utf8");
	const lines = raw.split("\n");
	const entries: SessionEntry[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const parsed = JSON.parse(trimmed) as SessionEntry;
			if (parsed && typeof parsed === "object" && "id" in parsed) {
				entries.push(parsed);
			}
		} catch {
			// Skip malformed lines silently
		}
	}

	return entries;
}
