# @the-forge-flow/ultra-compress-pi

> "why use many token when few do trick"

PI extension for token-efficient prose. Two capabilities, one ladder of intensity levels, shared rule set.

- **Runtime mode** — reshape the agent's output style via a persistent level (`/uc <level>`). Applies caveman-style prose compression to assistant messages. Auto-Clarity override falls back to prose for destructive/security/ordered turns.
- **File mode** — compress markdown files (skills, agents, memory docs) via `/uc-file <path> <level>`. Hybrid engine: deterministic pre-pass → LLM rewrite → structural validator → targeted repair loop.

## Levels

| Level | Effect |
|---|---|
| `off` | No modification. |
| `lite` | Drop filler, hedging, pleasantries. Keep articles. |
| `standard` | Drop articles + connectives. Fragments OK. Substitutions. |
| `ultra` | Abbreviations (DB, auth, req, res, fn, impl). Arrow causality. |
| `symbolic` | Math/logic notation (∀ ∃ ∧ → ⟺). Greek vars for repeated concepts. |

## Installation

From npm:

```bash
pi install npm:@the-forge-flow/ultra-compress-pi
```

From GitHub:

```bash
pi install github:MonsieurBarti/ultra-compress-pi
```

## Commands

| Command | Description |
|---|---|
| `/uc <level>` | Set the active level for this project. Autocomplete over the 5 levels. Persists in `.pi/ultra-compress.json`. |
| `/uc-file <path> <level> [--yes]` | Compress a markdown file. Without `--yes`, prints a preview. With `--yes`, writes and backs up to `<path>.original.md`. |
| `/uc-status` | Show active level, session stats, recently compressed files. |
| `/uc-revert <path>` | Restore a file from its `.original.md` backup. |

## Library API (for other PI extensions)

```ts
import {
  compressText,
  compressTextLexical,
  buildLevelPromptFragment,
  validateCompression,
  getActiveLevel,
} from "@the-forge-flow/ultra-compress-pi";

// In your extension's command/hook handler:
const result = await compressText(markdownBody, "ultra", ctx);
```

All LLM-backed methods require an active PI ExtensionContext (for model registry access).

## Development

```bash
bun install
bun run test
bun run typecheck
bun run lint
bun run build
```

## Project Structure

```
src/
├── commands/         # /uc, /uc-file, /uc-status, /uc-revert
├── hooks/            # session_start, before_agent_start
├── services/         # state-store, level-rules, compress-pipeline, validator, stats
└── skills/
    └── ultra-compress/
        └── SKILL.md  # dogfooded symbolic notation
```

## License

MIT © The Forge Flow
