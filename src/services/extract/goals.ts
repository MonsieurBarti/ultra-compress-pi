export interface ExtractGoalOptions {
	maxLength?: number;
}

const TASK_VERBS = [
	"implement",
	"build",
	"create",
	"add",
	"fix",
	"update",
	"refactor",
	"optimize",
	"migrate",
	"integrate",
	"setup",
	"configure",
	"deploy",
	"test",
	"debug",
	"resolve",
	"enhance",
	"extend",
	"modify",
	"change",
	"convert",
	"port",
	"rewrite",
	"remove",
	"delete",
	"clean",
	"organize",
	"structure",
	"design",
	"develop",
	"write",
	"generate",
	"produce",
];

const SCOPE_CHANGE_SIGNALS = [
	"instead",
	"change of plan",
	"switch to",
	"pivot to",
	"move to",
	"replace with",
	"use ",
	"rather than",
	"forget",
	"drop",
	"abandon",
	"new plan",
	"reconsider",
	"let's try",
	"different approach",
];

const NOISE_PATTERNS = [
	/^\s*\d+\./, // numbered lists
	/^\s*[-*]\s+/, // bullet lists
	/\b(todo|fixme|hack|bug|note|warning)\b/i,
	/\b(please|could you|can you|would you)\b/i,
	/\b(hello|hi|hey|thanks|thank you)\b/i,
	/\b(here is|below is|see below|as follows)\b/i,
];

const TEMPLATE_PATTERNS = [
	/\{\{.*?\}\}/g, // handlebars
	/\$\{.*?\}/g, // template literals
	/\b(placeholder|example|sample|demo|template)\b/gi,
];

function isNoise(text: string): boolean {
	return NOISE_PATTERNS.some((p) => p.test(text));
}

function truncateTemplate(text: string, maxLength: number): string {
	let cleaned = text;
	for (const pattern of TEMPLATE_PATTERNS) {
		cleaned = cleaned.replace(pattern, "...");
	}
	cleaned = cleaned.replace(/\s+/g, " ").trim();
	return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function detectTaskVerb(text: string): string | null {
	const lower = text.toLowerCase();
	for (const verb of TASK_VERBS) {
		if (lower.includes(verb)) {
			return verb;
		}
	}
	return null;
}

function detectScopeChange(text: string): string | null {
	const lower = text.toLowerCase();
	for (const signal of SCOPE_CHANGE_SIGNALS) {
		if (lower.includes(signal.toLowerCase())) {
			return signal;
		}
	}
	return null;
}

export function extractGoal(
	messages: Array<{ role: string; content: string }>,
	opts: ExtractGoalOptions = {},
): string {
	const maxLength = opts.maxLength ?? 120;
	const goals: string[] = [];

	for (const msg of messages) {
		if (msg.role !== "user") continue;
		const text = msg.content.trim();
		if (!text || text.length < 5) continue;
		if (isNoise(text)) continue;

		const scopeChange = detectScopeChange(text);
		if (scopeChange) {
			const cleaned = truncateTemplate(text, maxLength);
			goals.push(`[Scope change] ${cleaned}`);
			continue;
		}

		const verb = detectTaskVerb(text);
		if (verb) {
			const cleaned = truncateTemplate(text, maxLength);
			if (!goals.includes(cleaned)) {
				goals.push(cleaned);
			}
		}
	}

	if (goals.length === 0) {
		const firstUser = messages.find((m) => m.role === "user");
		if (firstUser) {
			const cleaned = truncateTemplate(firstUser.content.trim(), maxLength);
			return cleaned || "No active goal";
		}
		return "No active goal";
	}

	return goals.join("\n");
}
