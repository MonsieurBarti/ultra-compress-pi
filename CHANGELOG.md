# Changelog

## [0.1.3](https://github.com/MonsieurBarti/ultra-compress-pi/compare/ultra-compress-pi-v0.1.2...ultra-compress-pi-v0.1.3) (2026-04-12)


### Bug Fixes

* use explicit .js suffixes on relative imports (esm compliance) ([a83548b](https://github.com/MonsieurBarti/ultra-compress-pi/commit/a83548b0272883267cbeafb461b878ac27b03151))
* use explicit .js suffixes on relative imports (esm compliance) ([deb0bab](https://github.com/MonsieurBarti/ultra-compress-pi/commit/deb0bab2398d5245242e0c922180a8c75e532e19))

## [0.1.3] - 2026-04-12

### Fixed
- Relative imports now include explicit `.js` suffixes so Node ESM resolves
  the built package correctly. Previously, directory imports like
  `from "./commands"` failed with `ERR_MODULE_NOT_FOUND` when downstream
  projects imported this package at runtime.

## [0.1.2](https://github.com/MonsieurBarti/ultra-compress-pi/compare/ultra-compress-pi-v0.1.1...ultra-compress-pi-v0.1.2) (2026-04-12)


### Features

* **commands:** add usage hint for /uc and path autocomplete for /uc-revert ([cd36b5c](https://github.com/MonsieurBarti/ultra-compress-pi/commit/cd36b5c35d4f96cae97f6566581d1e91f0dd32c2))


### Bug Fixes

* align with PI framework API per docs audit ([ba5de9a](https://github.com/MonsieurBarti/ultra-compress-pi/commit/ba5de9a15076f8227897e3b9a53ca1a87e71f88f))
* **hooks:** handle image-only inputs in before_agent_start guard ([12f5a47](https://github.com/MonsieurBarti/ultra-compress-pi/commit/12f5a472ac6bdb6dcfdea07f6e7f6a8352aa0c69))
* **hooks:** use skillpaths key in resources_discover (not skills) ([9715060](https://github.com/MonsieurBarti/ultra-compress-pi/commit/9715060fa6fc2226240ecc73d9490b90cebaa588))
* **llm:** check auth.ok from getapikeyandeaders and surface llmautherror ([60a43f4](https://github.com/MonsieurBarti/ultra-compress-pi/commit/60a43f47e1fa429c7fbc8dc95859169bec78aad7))
* **llm:** use ctx.model instead of undocumented modelregistry.find ([ab60913](https://github.com/MonsieurBarti/ultra-compress-pi/commit/ab60913ae49cc9f3d3f32b7e18963e52d117348e))

## [0.1.1](https://github.com/MonsieurBarti/ultra-compress-pi/compare/ultra-compress-pi-v0.1.0...ultra-compress-pi-v0.1.1) (2026-04-12)


### Features

* add core types and error classes ([ed0e317](https://github.com/MonsieurBarti/ultra-compress-pi/commit/ed0e317360446427839510fb13849908c1a32f3f))
* **commands:** add /uc command with level autocomplete ([efc3748](https://github.com/MonsieurBarti/ultra-compress-pi/commit/efc374883374e771997fceacd62846be9ee6b284))
* **commands:** add /uc-file with compress pipeline, backup, and autocomplete ([23a65cf](https://github.com/MonsieurBarti/ultra-compress-pi/commit/23a65cf19a9d7fcf66766afbbe0d0a970280d69b))
* **commands:** add /uc-revert command ([5efca0e](https://github.com/MonsieurBarti/ultra-compress-pi/commit/5efca0ebb1d210e7ddd82c29a99c036dd51ee8fd))
* **commands:** add /uc-status command ([ded1fc6](https://github.com/MonsieurBarti/ultra-compress-pi/commit/ded1fc636d29dacc934d6a5b9d472dc3b90f2e52))
* **hooks:** add agent_end hook for session stats auto-increment ([e7bbd60](https://github.com/MonsieurBarti/ultra-compress-pi/commit/e7bbd60732832ae8bce3cf942661405e3bc7b616))
* **hooks:** add before_agent_start hook to augment system prompt with level marker ([d3069bd](https://github.com/MonsieurBarti/ultra-compress-pi/commit/d3069bdaa07f9a78a53a1078585fda956d28ea06))
* initial implementation of ultra-compress PI extension ([16f2604](https://github.com/MonsieurBarti/ultra-compress-pi/commit/16f2604b574b650dc071b70307950a0cac272050))
* **pipeline:** detect dropped protected tokens pre-unmask and surface specific repair signal ([9709102](https://github.com/MonsieurBarti/ultra-compress-pi/commit/97091023e2f455b620559ea8951748b58607232b))
* **services:** add deterministic level-rules pre-pass with protected-zone masking ([3527cba](https://github.com/MonsieurBarti/ultra-compress-pi/commit/3527cba0fcf17dfe2680e6ddcfcd066272ba5836))
* **services:** add level prompt fragments for runtime and file modes ([a81cfa9](https://github.com/MonsieurBarti/ultra-compress-pi/commit/a81cfa928d521d057dfa27170bd472cff80864e5))
* **services:** add state-store with round-trip, reset, and corrupt-file recovery ([7f75329](https://github.com/MonsieurBarti/ultra-compress-pi/commit/7f75329a236a3e266cfc396cd5543911542b147e))
* **services:** add stats heuristic for estimated chars saved per level ([893ed2e](https://github.com/MonsieurBarti/ultra-compress-pi/commit/893ed2edffb6ab723ff324ce6eb6f3b17a0137c1))
* **services:** add structural validator for compression invariants ([a74ebf2](https://github.com/MonsieurBarti/ultra-compress-pi/commit/a74ebf25696e545906a26104b5ba8e6a7bf0dbba))
* wire pi extension registrar and library exports ([df147c0](https://github.com/MonsieurBarti/ultra-compress-pi/commit/df147c05ae02ddaa36af76994c1c3f94116b6aba))


### Bug Fixes

* **commands:** use literal .original.md backup filename for all supported extensions ([9bbeaf7](https://github.com/MonsieurBarti/ultra-compress-pi/commit/9bbeaf7737b1d9e83443506ef831c5dfd847c551))
* **security:** atomic state file write + reject symlinked state path ([f4eaef6](https://github.com/MonsieurBarti/ultra-compress-pi/commit/f4eaef63af8e35e48ea370524ee01a331b38f56c))
* **security:** reject path traversal and symlinks in uc-file and uc-revert ([2839bb6](https://github.com/MonsieurBarti/ultra-compress-pi/commit/2839bb6f0ba75bf87222e5333171d8595a2a0a6f))
* **validator:** detect heading reordering, not just count drift ([fcfab35](https://github.com/MonsieurBarti/ultra-compress-pi/commit/fcfab350c22a30efe0b220da0aef5a9c14f314ac))

## Changelog

All notable changes to this project will be documented in this file.
