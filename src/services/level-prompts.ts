import type { ActiveLevel, Mode } from "../types";

const RUNTIME_BASE = `
You are operating in ultra-compress mode. Reduce output tokens by compressing prose.

Auto-Clarity override: temporarily fall back to full prose for the CURRENT assistant message when the turn involves any of:
  - security / safety warnings
  - destructive operations needing confirmation (rm -rf, git reset --hard, force push, DROP, etc.)
  - numbered multi-step sequences where order matters
  - verbatim-quoted error messages or logs
Resume the active level on the next turn.

Always preserve: fenced + inline code, URLs, file paths, CLI commands, tool names, $ARGUMENTS, quoted error strings, numeric versions/dates, frontmatter, heading structure.
`.trim();

const RUNTIME_RULES: Record<ActiveLevel, string> = {
	lite: `
LEVEL = lite. Drop filler words (just, really, basically, actually, simply, essentially).
Drop hedging (might be worth, could consider, you might want to).
Drop pleasantries (sure, certainly, of course, happy to, I'd recommend).
Keep articles (a/an/the) and full sentences. Professional but tight.`.trim(),
	standard: `
LEVEL = standard. Inherit lite rules, plus:
Drop articles (a/an/the). Drop connectives (however, furthermore, additionally, moreover).
Fragments allowed. Pattern: [thing] [action] [reason]. [next step].
Substitute: utilize→use, in order to→to, make sure to→ensure, the reason is because→because.
Use shorter synonyms: big (not extensive), fix (not implement a solution for).`.trim(),
	ultra: `
LEVEL = ultra. Inherit standard rules, plus:
Abbreviate technical words: database→DB, authentication→auth, configuration→config,
request→req, response→res, function→fn, implementation→impl, environment→env, error→err.
Use arrow causality: "X causes Y" → "X → Y".
Strip conjunctions where meaning survives.`.trim(),
	symbolic: `
LEVEL = symbolic. Inherit ultra rules, plus:
When context makes it unambiguous to the reader, use math/logic notation:
  ∀ (for all), ∃ (exists), ∧ (and), ∨ (or), ¬ (not), → (implies), ⟺ (iff),
  ∈ (in), ∉ (not in), ⊂ (subset), ∪ (union), ∩ (intersect), ∅ (empty set), { } (set).
Fold conditions into predicates: "pred(x) ⟺ A ∧ B".
IMPORTANT: Fall back to LEVEL=ultra if the conversation context suggests the human
is not fluent in this notation (e.g. UI/design questions, non-technical topics).`.trim(),
};

const FILE_BASE = `
You are rewriting a markdown file to reduce token cost. Follow the level rules below.

Preserve byte-identical: frontmatter, fenced code blocks, inline code spans, URLs, file paths,
CLI command lines, tool names, $ARGUMENTS, headings (count + order + exact text optional at ultra+),
numeric versions/dates, numbered lists, table structure, bullet nesting depth.

Do NOT wrap your response in any markdown code fence. Output ONLY the rewritten file body.
Preserve any ⟨PROT:N⟩ tokens verbatim — they are placeholders for protected content.
`.trim();

const FILE_RULES: Record<ActiveLevel, string> = {
	lite: "LEVEL = lite. Drop filler/hedging/pleasantries from prose. Preserve all structure verbatim. Target ~15-25% reduction.",
	standard: `LEVEL = standard. Inherit lite rules, plus:
Drop articles and connectives. Allow fragments. Apply substitutions (utilize→use, in order to→to, make sure to→ensure).
R6: tables/lists stay structurally intact; only wording compresses.
R7: prune redundant examples (leave one canonical example per concept).
Target ~35-50% reduction.`,
	ultra: `LEVEL = ultra. Inherit standard rules, plus:
Abbreviate (DB, auth, config, req, res, fn, impl, env, err).
Arrow causality (X → Y).
R1: concepts appearing ≥3× get Greek-letter definitions in a "Let:" block at the top.
R8: literals appearing ≥2× become named constants.
R10: repeated parameterized patterns become F(x, y).
Target ~50-65% reduction.`,
	symbolic: `LEVEL = symbolic. Inherit ultra rules, plus:
R2: multi-bullet conditions collapse to predicates: pred(x) ⟺ A ∧ B ∧ C.
R3: quantifier rewrites — "for each x in Y" → ∀ x ∈ Y:, "if any x" → ∃ x:.
R4: implications as arrows — "if X then Y" → X → Y.
R9: workflows become O_name { step₁; step₂; … } → output.
Use Greek vars (φ, γ, τ, π, σ) for repeated concepts.
Target ~55-70% reduction.`,
};

export function buildLevelPromptFragment(level: ActiveLevel, mode: Mode): string {
	if (mode === "runtime") {
		return `${RUNTIME_BASE}\n\n${RUNTIME_RULES[level]}`;
	}
	return `${FILE_BASE}\n\n${FILE_RULES[level]}`;
}
