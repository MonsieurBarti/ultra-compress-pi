<div align="center">
  <img src="https://raw.githubusercontent.com/MonsieurBarti/The-Forge-Flow-CC/refs/heads/main/assets/forge-banner.png" alt="The Forge Flow" width="100%">

  <h1>🗜️ Ultra-Compress PI Extension</h1>

  <p>
    <strong>Token-efficient prose for PI coding agents — level-based runtime compression and markdown file compression</strong>
  </p>

  <p>
    <a href="https://github.com/MonsieurBarti/ultra-compress-pi/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/MonsieurBarti/ultra-compress-pi/ci.yml?label=CI&style=flat-square" alt="CI Status">
    </a>
    <a href="https://www.npmjs.com/package/@the-forge-flow/ultra-compress-pi">
      <img src="https://img.shields.io/npm/v/@the-forge-flow/ultra-compress-pi?style=flat-square" alt="npm version">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/MonsieurBarti/ultra-compress-pi?style=flat-square" alt="License">
    </a>
  </p>
</div>

---

> "why use many token when few do trick"

## ✨ Features

- **🎚️ Runtime mode**: Reshape assistant output via a persistent compression level (`/uc <level>`). Auto-Clarity override falls back to prose for destructive/security/ordered turns.
- **📝 File mode**: Compress markdown files (skills, agents, memory docs) via `/uc-file <path> <level>`. Deterministic pre-pass → LLM rewrite → structural validator → targeted repair loop.
- **🪜 Five levels**: `off`, `lite`, `standard`, `ultra`, `symbolic` — from no change to Greek/math notation.
- **💾 Safe by default**: File mode backs up originals to `<path>.original.md`; `/uc-revert` restores them.
- **📚 Library API**: Importable helpers for other PI extensions to apply the same compression rules.

## 🪜 Levels

| Level | Effect |
|---|---|
| `off` | No modification. |
| `lite` | Drop filler, hedging, pleasantries. Keep articles. |
| `standard` | Drop articles + connectives. Fragments OK. Substitutions. |
| `ultra` | Abbreviations (DB, auth, req, res, fn, impl). Arrow causality. |
| `symbolic` | Math/logic notation (∀ ∃ ∧ → ⟺). Greek vars for repeated concepts. |

## 📦 Installation

PI discovers the extension automatically once installed as a pi package.

**From npm:**

```bash
pi install npm:@the-forge-flow/ultra-compress-pi
```

**From GitHub:**

```bash
pi install git:github.com/MonsieurBarti/ultra-compress-pi
```

Then reload PI with `/reload`.

## 🚀 Usage

### Commands

| Command | Description |
|---|---|
| `/uc <level>` | Set the active level for this project. Autocomplete over the 5 levels. Persists in `.pi/ultra-compress.json`. |
| `/uc-file <path> <level> [--yes]` | Compress a markdown file. Without `--yes`, prints a preview. With `--yes`, writes and backs up to `<path>.original.md`. |
| `/uc-status` | Show active level, session stats, and recently compressed files. |
| `/uc-revert <path>` | Restore a file from its `.original.md` backup. |

### Library API (for other PI extensions)

```typescript
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

All LLM-backed methods require an active PI `ExtensionContext` (for model registry access).

## 🧪 Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Lint & format
bun run lint

# Type check
bun run typecheck

# Build for publish
bun run build
```

## 📁 Project Structure

```
src/
├── index.ts              # Extension entry point + library exports
├── commands/             # /uc, /uc-file, /uc-status, /uc-revert
├── hooks/                # session_start, before_agent_start
├── services/             # state-store, level-rules, compress-pipeline, validator, stats
└── skills/
    └── ultra-compress/
        └── SKILL.md      # dogfooded symbolic notation
tests/
└── unit/                 # Unit tests
.github/workflows/
├── ci.yml                # CI pipeline
└── release.yml           # Release automation
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit with conventional commits (`git commit -m "feat: add something"`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📜 License

MIT © [MonsieurBarti](https://github.com/MonsieurBarti)

---

<div align="center">
  <sub>Built with ⚡ by <a href="https://github.com/MonsieurBarti">MonsieurBarti</a></sub>
</div>
