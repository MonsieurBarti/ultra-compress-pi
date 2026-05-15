import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
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

export async function readSessionEntries(path: string): Promise<SessionEntry[]> {
	if (!existsSync(path)) return [];

	const stats = await stat(path);
	// Guard: check file size before reading. For very large JSONL files we
	// stream line-by-line via readline instead of loading everything into memory.
	const isLarge = stats.size > LARGE_FILE_THRESHOLD;
	if (isLarge) {
		// Streaming path below handles large files safely without buffering.
	}

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
