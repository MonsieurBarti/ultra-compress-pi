---
name: ultra-compress
description: "Compress runtime output or markdown files. Levels: off|lite|standard|ultra|symbolic. Triggers: \"caveman mode\" | \"ultra compress\" | \"shorten output\" | \"compress skill\" | \"compress this file\" | \"make it formal\" | \"use formal notation\" | \"talk like caveman\"."
license: MIT
allowed-tools: read, write, edit, glob, grep
disable-model-invocation: false
---

# ultra-compress — κ

Let:
  L ∈ {off, lite, standard, ultra, symbolic}  — level
  M ∈ {runtime, file}                          — mode
  Π := protected zones (¬compress)
  Ω := Auto-Clarity override

## κ(L, M) — compress

M = runtime → reshape current assistant msg per L rules.
M = file    → rewrite .md file per L rules, preserve Π byte-identical.

Each L ⊃ all prior L's rules (inheritance).

## L = lite

¬{filler: just, really, basically, actually, simply, essentially, generally};
¬{hedging: "might be worth", "could consider", "you might want to"};
¬{pleasantries: sure, certainly, "of course", "happy to", "I'd recommend"};
keep articles ∧ full sentences.

## L = standard

lite ∧:
¬articles(a, an, the);
¬connectives(however, furthermore, additionally, moreover);
fragments OK: [thing] [action] [reason]. [next].
subst: {utilize → use, "in order to" → to, "make sure to" → ensure,
        "the reason is because" → because, "prior to" → before}.

## L = ultra

standard ∧:
abbrev: {database → DB, authentication → auth, configuration → config,
         request → req, response → res, function → fn, implementation → impl,
         environment → env, error → err};
causality: "X causes Y" → "X → Y";
¬conjunctions(where meaning survives).

## L = symbolic

ultra ∧:
math/logic ops: {∀, ∃, ∧, ∨, ¬, →, ⟺, ∈, ∉, ⊂, ∪, ∩, ∅, { }, ; };
predicate folding: "pred(x) ⟺ A ∧ B";
Greek vars (φ, γ, τ, π, σ) ← concepts ≥3×;
IMPORTANT: ∃ context ⟹ reader ¬fluent(notation) → fallback L = ultra.

## Π — protected zones (¬compress, ∀ L, ∀ M)

frontmatter · fenced + inline code · URLs · file paths · CLI commands ·
headings(count + order) · $ARGUMENTS · tool names · numeric versions/dates ·
quoted error strings · table structure · bullet nesting depth.

## Ω — Auto-Clarity (M = runtime ∧ L ≠ off)

turn ∈ { security-warning, destructive-confirm, ordered-multi-step, verbatim-error-quote }
  → fallback prose(current msg) ∧ resume(L, next turn) ∧ autoClarityCount += 1.

destructive := { rm -rf, "git reset --hard", force-push, DROP, TRUNCATE }.

## file-mode pipeline (M = file)

O_file {
  resolve(path);
  guard(size ≤ 500KB ∧ ext ∈ {md, txt, rst} ∧ ¬backup-exists);
  mask(input, Π) → (masked, tokens);
  lexical-pre-pass(masked, L) → L-masked;
  LLM(L-masked, level-prompt(L, file)) → raw;
  strip-outer-fence(raw) → stripped;
  unmask(stripped, tokens) → candidate;
  validate(input, candidate) → report;
  report.ok ? write(candidate, backup=.original.md) : repair-loop(≤ 2);
} → { compressed, ratio, warnings }.

repair-loop: LLM(¬recompress ∧ patch-only(report.errors)) → retry.
final-fail → restore(original) ∧ throw ValidatorFailedError.

## commands (PI)

/uc L                                  → κ-runtime set L, persist .pi/ultra-compress.json
/uc-file path L [--yes]                → κ-file path L, preview unless --yes
/uc-status                             → L ∧ session stats
/uc-revert path                        → restore path from .original.md

completers: autocomplete(L) ∀ /uc, /uc-file; glob(*.md) ∀ /uc-file position 1.
