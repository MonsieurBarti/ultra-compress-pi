import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Level, ProjectState, SessionStats } from "../types";

const STATE_FILENAME = "ultra-compress.json";
const STATE_SUBDIR = ".pi";

let projectRootOverride: string | undefined;

export function setProjectRootForTest(root: string): void {
	projectRootOverride = root;
}

function resolveStatePath(projectRoot?: string): string {
	const root = projectRootOverride ?? projectRoot ?? process.cwd();
	return join(root, STATE_SUBDIR, STATE_FILENAME);
}

function freshSession(): SessionStats {
	return {
		startedAt: new Date().toISOString(),
		autoClarityCount: 0,
		estimatedOutputCharsSaved: 0,
		filesCompressed: [],
	};
}

function defaultState(): ProjectState {
	return {
		level: "off",
		updatedAt: new Date().toISOString(),
		session: freshSession(),
	};
}

export async function loadState(projectRoot?: string): Promise<ProjectState> {
	const path = resolveStatePath(projectRoot);
	if (!existsSync(path)) return defaultState();

	try {
		const raw = await readFile(path, "utf8");
		const parsed = JSON.parse(raw) as Partial<ProjectState>;
		if (!parsed || typeof parsed !== "object") throw new Error("not an object");
		const level = (parsed.level ?? "off") as Level;
		return {
			level,
			updatedAt: parsed.updatedAt ?? new Date().toISOString(),
			session: parsed.session ?? freshSession(),
		};
	} catch {
		const corruptPath = `${path}.corrupt-${Date.now()}`;
		await rename(path, corruptPath).catch(() => {});
		return defaultState();
	}
}

export async function saveState(state: ProjectState, projectRoot?: string): Promise<void> {
	const path = resolveStatePath(projectRoot);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(state, null, 2), "utf8");
}

export async function saveLevel(level: Level, projectRoot?: string): Promise<ProjectState> {
	const current = await loadState(projectRoot);
	const next: ProjectState = {
		...current,
		level,
		updatedAt: new Date().toISOString(),
	};
	await saveState(next, projectRoot);
	return next;
}

export async function resetSessionStats(projectRoot?: string): Promise<ProjectState> {
	const current = await loadState(projectRoot);
	const next: ProjectState = {
		...current,
		session: freshSession(),
		updatedAt: new Date().toISOString(),
	};
	await saveState(next, projectRoot);
	return next;
}

export async function appendCompressedFile(
	entry: ProjectState["session"]["filesCompressed"][number],
	projectRoot?: string,
): Promise<void> {
	const current = await loadState(projectRoot);
	current.session.filesCompressed.push(entry);
	current.updatedAt = new Date().toISOString();
	await saveState(current, projectRoot);
}

export async function incrementAutoClarity(projectRoot?: string): Promise<void> {
	const current = await loadState(projectRoot);
	current.session.autoClarityCount += 1;
	await saveState(current, projectRoot);
}

export async function addCharsSaved(chars: number, projectRoot?: string): Promise<void> {
	const current = await loadState(projectRoot);
	current.session.estimatedOutputCharsSaved += chars;
	await saveState(current, projectRoot);
}
