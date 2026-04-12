export { buildLevelPromptFragment } from "./level-prompts.js";
export { applyLevelLexical, maskProtectedZones, unmaskProtectedZones } from "./level-rules.js";
export { validateCompression } from "./validator.js";
export { levelFactor, estimateCharsSaved } from "./stats.js";
export {
	loadState,
	saveLevel,
	saveState,
	resetSessionStats,
	appendCompressedFile,
	incrementAutoClarity,
	addCharsSaved,
} from "./state-store.js";
