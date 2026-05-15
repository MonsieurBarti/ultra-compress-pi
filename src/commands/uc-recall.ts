import { paginateResults, rankResults, searchSessionEntries } from "../services/recall-engine.js";
import { readSessionEntries, resolveSessionJsonlPath } from "../services/session-reader.js";
import type { CommandDefinition } from "./types.js";

function parseRecallArgs(args: string): { query: string; page: number; expand?: number[] } {
	const trimmed = args.trim();
	if (!trimmed) return { query: "", page: 1 };

	const expandMatch = trimmed.match(/expand:(\d+(?:,\d+)*)/);
	const expand = expandMatch?.[1]
		? expandMatch[1]
				.split(",")
				.map((n) => Number.parseInt(n.trim(), 10))
				.filter((n) => !Number.isNaN(n))
		: undefined;

	const pageMatch = trimmed.match(/page:(\d+)/);
	const page = pageMatch?.[1] ? Number.parseInt(pageMatch[1], 10) : 1;

	const query = trimmed
		.replace(/expand:\d+(?:,\d+)*/g, "")
		.replace(/page:\d+/g, "")
		.trim();

	return { query, page: Number.isNaN(page) || page < 1 ? 1 : page, ...(expand ? { expand } : {}) };
}

export function createUcRecallCommand(): CommandDefinition {
	return {
		name: "uc-recall",
		description:
			"Search session history with regex or ranked multi-word queries. Usage: /uc-recall <query> [page:N] [expand:1,2,3]",
		async handler(args, ctx) {
			const path = resolveSessionJsonlPath({ projectRoot: ctx.cwd });
			if (!path) {
				ctx.ui.notify("ultra-compact: no session JSONL found", "warning");
				return;
			}
			const entries = await readSessionEntries(path);
			if (entries.length === 0) {
				ctx.ui.notify("ultra-compact: session is empty", "info");
				return;
			}

			const { query, page, expand } = parseRecallArgs(args);
			if (!query) {
				// No query: show last 25 entries as brief summaries
				const recent = entries.slice(-25);
				const lines = recent.map(
					(e, i) => `${entries.length - 25 + i + 1}. ${e.type}: ${String(e.content).slice(0, 100)}`,
				);
				ctx.ui.notify(["Recent session entries:", ...lines].join("\n"), "info");
				return;
			}

			const matches = searchSessionEntries(entries, query);
			if (matches.length === 0) {
				ctx.ui.notify(`ultra-compact: no results for "${query}"`, "info");
				return;
			}

			const ranked = rankResults(matches, query);

			if (expand && expand.length > 0) {
				const expanded = expand
					.map((idx) => {
						const match = ranked.find((m) => m.index === idx);
						return match ? `Entry #${idx}:\n${JSON.stringify(match.entry, null, 2)}` : null;
					})
					.filter(Boolean)
					.join("\n\n");
				ctx.ui.notify(expanded || "No matching entries to expand.", "info");
				return;
			}

			const paged = paginateResults(ranked, page);
			const lines = [
				`Results for "${query}" (page ${paged.page} of ${Math.ceil(paged.total / paged.pageSize)}):`,
				...paged.matches.map(
					(m) =>
						`#${m.index} ${m.entry.type}: ${String(m.entry.content).slice(0, 200)} (score: ${m.score.toFixed(2)})`,
				),
			];
			ctx.ui.notify(lines.join("\n"), "info");
		},
	};
}
