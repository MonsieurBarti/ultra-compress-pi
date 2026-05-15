export interface BriefLine {
	role: string;
	content: string;
	turn: number;
}

export interface BuildBriefOptions {
	maxUserWords?: number;
	maxAssistantWords?: number;
	maxToolLines?: number;
	maxLinesPerTurn?: number;
	stopwords?: string[];
}

const DEFAULT_STOPWORDS = new Set([
	"the",
	"a",
	"an",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"must",
	"shall",
	"can",
	"need",
	"dare",
	"ought",
	"used",
	"to",
	"of",
	"in",
	"for",
	"on",
	"with",
	"at",
	"by",
	"from",
	"as",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"between",
	"under",
	"again",
	"further",
	"then",
	"once",
	"here",
	"there",
	"when",
	"where",
	"why",
	"how",
	"all",
	"each",
	"few",
	"more",
	"most",
	"other",
	"some",
	"such",
	"no",
	"nor",
	"not",
	"only",
	"own",
	"same",
	"so",
	"than",
	"too",
	"very",
	"just",
	"and",
	"but",
	"if",
	"or",
	"because",
	"until",
	"while",
	"this",
	"that",
	"these",
	"those",
	"i",
	"me",
	"my",
	"we",
	"our",
	"you",
	"your",
	"he",
	"him",
	"his",
	"she",
	"her",
	"it",
	"its",
	"they",
	"them",
	"their",
	"what",
	"which",
	"who",
	"whom",
]);

function getSegmenter(): Intl.Segmenter | null {
	try {
		if (typeof Intl !== "undefined" && Intl.Segmenter) {
			return new Intl.Segmenter("en", { granularity: "word" });
		}
	} catch {
		// Fallback below
	}
	return null;
}

function countMeaningfulWords(text: string, stopwords?: Set<string>): number {
	const segmenter = getSegmenter();
	const stops = stopwords ?? DEFAULT_STOPWORDS;
	if (segmenter) {
		let count = 0;
		for (const segment of segmenter.segment(text)) {
			if (segment.isWordLike) {
				const word = segment.segment.toLowerCase();
				if (!stops.has(word)) count++;
			}
		}
		return count;
	}
	// Fallback: simple regex word splitting
	return text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((w) => w.length > 1 && !stops.has(w)).length;
}

function truncateToWordBudget(text: string, budget: number, stopwords?: Set<string>): string {
	const segmenter = getSegmenter();
	const stops = stopwords ?? DEFAULT_STOPWORDS;
	if (!segmenter) {
		// Simple fallback: truncate to character ratio (~4 chars per word)
		const approxChars = budget * 4;
		return text.length > approxChars ? `${text.slice(0, approxChars)}...` : text;
	}

	const words: string[] = [];
	let meaningfulCount = 0;
	for (const segment of segmenter.segment(text)) {
		words.push(segment.segment);
		if (segment.isWordLike) {
			const word = segment.segment.toLowerCase();
			if (!stops.has(word)) meaningfulCount++;
		}
		if (meaningfulCount >= budget) break;
	}
	return words.join("").trim();
}

function collapseBashCommand(args: Record<string, unknown>): string {
	const cmd = args.command ?? args.cmd ?? args.script ?? "";
	if (typeof cmd === "string" && cmd.trim()) {
		const lines = cmd.trim().split("\n");
		const first = lines[0] ?? "";
		if (lines.length > 1) return `${first} ... (+${lines.length - 1} lines)`;
		return first;
	}
	return JSON.stringify(args).slice(0, 60);
}

function formatToolCall(name: string, args: Record<string, unknown>): string {
	if (name === "bash" || name.includes("bash")) {
		return `* bash "${collapseBashCommand(args)}"`;
	}
	const argStr = Object.entries(args)
		.map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 40)}`)
		.join(" ");
	return `* ${name} ${argStr}`;
}

export function buildBrief(
	messages: Array<{
		role: string;
		content: string;
		toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
		toolResults?: Array<{ id: string; content: string }>;
	}>,
	opts: BuildBriefOptions = {},
): BriefLine[] {
	const maxUserWords = opts.maxUserWords ?? 256;
	const maxAssistantWords = opts.maxAssistantWords ?? 200;
	const maxToolLines = opts.maxToolLines ?? 8;
	const maxLinesPerTurn = opts.maxLinesPerTurn ?? 12;

	const lines: BriefLine[] = [];
	let turn = 0;
	let lastRole: string | null = null;
	let toolCallCount = 0;
	let turnLineCount = 0;

	function pushLine(role: string, content: string) {
		if (turnLineCount >= maxLinesPerTurn) return;
		lines.push({ role, content, turn });
		turnLineCount++;
	}

	for (const msg of messages) {
		// Turn boundary detection
		if (msg.role === "user" && lastRole !== "user") {
			turn++;
			toolCallCount = 0;
			turnLineCount = 0;
		}
		lastRole = msg.role;

		if (msg.role === "thinking") {
			continue; // Skip thinking blocks in brief
		}

		if (msg.toolCalls && msg.toolCalls.length > 0) {
			for (const tc of msg.toolCalls) {
				if (toolCallCount >= maxToolLines) {
					// Keep tail: if we're over limit, drop earliest and append new
					const firstToolIdx = lines.findIndex((l) => l.role === "tool");
					if (firstToolIdx >= 0) lines.splice(firstToolIdx, 1);
				}
				toolCallCount++;
				pushLine("tool", formatToolCall(tc.name, tc.arguments ?? {}));
			}
			continue;
		}

		if (msg.toolResults && msg.toolResults.length > 0) {
			for (const tr of msg.toolResults) {
				const preview = tr.content.length > 60 ? `${tr.content.slice(0, 60)}...` : tr.content;
				pushLine("tool_result", `→ ${preview}`);
			}
			continue;
		}

		// Text content truncation
		let content = msg.content;
		const budget = msg.role === "user" ? maxUserWords : maxAssistantWords;
		const wordCount = countMeaningfulWords(content);
		if (wordCount > budget) {
			content = truncateToWordBudget(content, budget);
			content += " ...";
		}

		const label =
			msg.role === "user" ? "[user]" : msg.role === "assistant" ? "[assistant]" : `[${msg.role}]`;
		pushLine(msg.role, `${label} ${content}`);
	}

	return lines;
}
