import { existsSync, lstatSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SessionCompactConfig } from "../types/session-compact.js";

const CONFIG_FILENAME = "ultra-compress-session.json";
const STATE_SUBDIR = ".pi";

let projectRootOverride: string | undefined;

export function setSessionCompactConfigProjectRootForTest(root: string): void {
	projectRootOverride = root;
}

function resolveConfigPath(projectRoot?: string): string {
	const root = projectRootOverride ?? projectRoot ?? process.cwd();
	return join(root, STATE_SUBDIR, CONFIG_FILENAME);
}

function defaultConfig(): SessionCompactConfig {
	return {
		overrideDefaultCompaction: false,
		useLLMForGoal: false,
		useVccPipeline: false,
		updatedAt: new Date().toISOString(),
	};
}

export async function loadSessionCompactConfig(
	projectRoot?: string,
): Promise<SessionCompactConfig> {
	const path = resolveConfigPath(projectRoot);
	if (!existsSync(path)) return defaultConfig();

	try {
		const raw = await readFile(path, "utf8");
		const parsed = JSON.parse(raw) as Partial<SessionCompactConfig>;
		if (!parsed || typeof parsed !== "object") throw new Error("not an object");
		return {
			overrideDefaultCompaction: parsed.overrideDefaultCompaction ?? false,
			useLLMForGoal: parsed.useLLMForGoal ?? false,
			useVccPipeline: parsed.useVccPipeline ?? false,
			updatedAt: parsed.updatedAt ?? new Date().toISOString(),
		};
	} catch {
		const corruptPath = `${path}.corrupt-${Date.now()}`;
		await rename(path, corruptPath).catch(() => {});
		return defaultConfig();
	}
}

export async function saveSessionCompactConfig(
	config: SessionCompactConfig,
	projectRoot?: string,
): Promise<void> {
	const path = resolveConfigPath(projectRoot);
	await mkdir(dirname(path), { recursive: true });

	try {
		const st = lstatSync(path);
		if (st.isSymbolicLink()) {
			throw new Error(`ultra-compress: refusing to overwrite symlink config file at ${path}`);
		}
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
	}

	const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
	await writeFile(tmp, JSON.stringify(config, null, 2), "utf8");
	await rename(tmp, path);
}

export async function ensureSessionCompactConfig(
	projectRoot?: string,
): Promise<SessionCompactConfig> {
	const path = resolveConfigPath(projectRoot);
	if (existsSync(path)) {
		return loadSessionCompactConfig(projectRoot);
	}
	const defaults = defaultConfig();
	await saveSessionCompactConfig(defaults, projectRoot);
	return defaults;
}
