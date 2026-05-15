import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
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

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

function parseEntries(lines: string[]): SessionEntry[] {
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

export async function readSessionEntries(path: string): Promise<SessionEntry[]> {
	if (!existsSync(path)) return [];

	const stats = await stat(path);

	if (stats.size <= LARGE_FILE_THRESHOLD) {
		// Small file: fast buffered read
		const raw = await readFile(path, "utf8");
		return parseEntries(raw.split("\n"));
	}

	// Large file: streaming read to avoid memory pressure
	const entries: SessionEntry[] = [];
	const stream = createReadStream(path, { encoding: "utf8" });
	const rl = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });

	for await (const line of rl) {
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
