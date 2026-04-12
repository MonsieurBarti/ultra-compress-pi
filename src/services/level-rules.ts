import type { ActiveLevel } from "../types";

export interface MaskResult {
	masked: string;
	tokens: string[];
}

const PROTECTED_PATTERNS: RegExp[] = [
	/```[\s\S]*?```/g,
	/`[^`\n]+`/g,
	/\bhttps?:\/\/\S+/g,
	/\$ARGUMENTS\b/g,
	/(?:^|\s)(\.?[\w.\-/]+\/[\w.\-/]+)(?=\s|$)/g,
	/(?:^|\s)([\w.-]+\.(?:ts|js|tsx|jsx|md|json|yaml|yml|py|rs|go|sh|sql))(?=\s|$)/g,
];

export function maskProtectedZones(input: string): MaskResult {
	const tokens: string[] = [];
	let masked = input;
	for (const pattern of PROTECTED_PATTERNS) {
		masked = masked.replace(pattern, (match) => {
			const token = `⟨PROT:${tokens.length}⟩`;
			tokens.push(match);
			return token;
		});
	}
	return { masked, tokens };
}

export function unmaskProtectedZones(masked: string, tokens: string[]): string {
	let out = masked;
	for (let i = 0; i < tokens.length; i++) {
		out = out.replace(`⟨PROT:${i}⟩`, tokens[i] ?? "");
	}
	return out;
}

const FILLERS = [
	"just",
	"really",
	"basically",
	"actually",
	"simply",
	"essentially",
	"generally",
	"literally",
	"obviously",
];

const HEDGING_PHRASES = [
	"it might be worth",
	"you could consider",
	"you might want to",
	"it could be",
	"perhaps you could",
];

const PLEASANTRIES = [
	"sure",
	"certainly",
	"of course",
	"happy to",
	"i'd recommend",
	"i would recommend",
];

const CONNECTIVES = ["however", "furthermore", "additionally", "moreover"];

const ARTICLES = /\b(?:a|an|the)\b/gi;

const SUBSTITUTIONS: Array<[RegExp, string]> = [
	[/\butilize\b/gi, "use"],
	[/\bin order to\b/gi, "to"],
	[/\bmake sure to\b/gi, "ensure"],
	[/\bthe reason is because\b/gi, "because"],
	[/\bat this point in time\b/gi, "now"],
	[/\bprior to\b/gi, "before"],
];

const ABBREVIATIONS: Array<[RegExp, string]> = [
	[/\bdatabase\b/gi, "DB"],
	[/\bauthentication\b/gi, "auth"],
	[/\bconfiguration\b/gi, "config"],
	[/\brequest\b/gi, "req"],
	[/\bresponse\b/gi, "res"],
	[/\bfunction\b/gi, "fn"],
	[/\bimplementation\b/gi, "impl"],
	[/\benvironment\b/gi, "env"],
	[/\berror\b/gi, "err"],
];

function wordListRegex(words: string[]): RegExp {
	const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	return new RegExp(`\\b(?:${escaped.join("|")})\\b`, "gi");
}

function phraseRegex(phrases: string[]): RegExp {
	const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	return new RegExp(`(?:${escaped.join("|")})`, "gi");
}

function collapseWhitespace(s: string): string {
	return s
		.replace(/[ \t]+/g, " ")
		.replace(/ +([.,;:!?])/g, "$1")
		.trim();
}

export function applyLevelLexical(input: string, level: ActiveLevel): string {
	let out = input;

	out = out.replace(phraseRegex(HEDGING_PHRASES), "");
	out = out.replace(phraseRegex(PLEASANTRIES), "");
	out = out.replace(wordListRegex(FILLERS), "");

	if (level === "lite") return collapseWhitespace(out);

	out = out.replace(ARTICLES, "");
	out = out.replace(wordListRegex(CONNECTIVES), "");
	for (const [pat, rep] of SUBSTITUTIONS) {
		out = out.replace(pat, rep);
	}

	if (level === "standard") return collapseWhitespace(out);

	for (const [pat, rep] of ABBREVIATIONS) {
		out = out.replace(pat, rep);
	}

	if (level === "ultra") return collapseWhitespace(out);

	return collapseWhitespace(out);
}
