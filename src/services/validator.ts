import type { ValidatorReport } from "../types.js";

const FENCED_RE = /```[\s\S]*?```/g;
const URL_RE = /\bhttps?:\/\/\S+/g;
const PATH_RE = /(?:^|\s)(\.?[\w.\-/]+\/[\w.\-/]+)(?=\s|$)/g;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/gm;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;
const BULLET_RE = /^\s*[-*+]\s+/gm;
const ARG_RE = /\$ARGUMENTS\b/g;

function extractAll(re: RegExp, src: string, group = 0): string[] {
	const out: string[] = [];
	const r = new RegExp(re.source, re.flags);
	let m: RegExpExecArray | null = r.exec(src);
	while (m !== null) {
		out.push(m[group] ?? m[0]);
		m = r.exec(src);
	}
	return out;
}

function setEqual(a: string[], b: string[]): boolean {
	const as = new Set(a);
	const bs = new Set(b);
	if (as.size !== bs.size) return false;
	for (const v of as) if (!bs.has(v)) return false;
	return true;
}

export function validateCompression(original: string, compressed: string): ValidatorReport {
	const errors: string[] = [];
	const warnings: string[] = [];

	const fencedBefore = extractAll(FENCED_RE, original);
	const fencedAfter = extractAll(FENCED_RE, compressed);
	if (fencedBefore.length !== fencedAfter.length) {
		errors.push(`fenced code block count changed: ${fencedBefore.length} → ${fencedAfter.length}`);
	} else {
		for (let i = 0; i < fencedBefore.length; i++) {
			if (fencedBefore[i] !== fencedAfter[i]) {
				errors.push(`fenced code block #${i} content changed`);
				break;
			}
		}
	}

	const urlsBefore = extractAll(URL_RE, original);
	const urlsAfter = extractAll(URL_RE, compressed);
	if (!setEqual(urlsBefore, urlsAfter)) {
		errors.push(`URL set changed (before=${urlsBefore.length}, after=${urlsAfter.length})`);
	}

	const pathsBefore = extractAll(PATH_RE, original, 1);
	const pathsAfter = extractAll(PATH_RE, compressed, 1);
	if (!setEqual(pathsBefore, pathsAfter)) {
		errors.push(`path set changed (before=${pathsBefore.length}, after=${pathsAfter.length})`);
	}

	const headingsBefore = extractAll(HEADING_RE, original).map((h) => h.trim());
	const headingsAfter = extractAll(HEADING_RE, compressed).map((h) => h.trim());
	if (headingsBefore.length !== headingsAfter.length) {
		errors.push(`heading count changed: ${headingsBefore.length} → ${headingsAfter.length}`);
	} else {
		for (let i = 0; i < headingsBefore.length; i++) {
			if (headingsBefore[i] !== headingsAfter[i]) {
				errors.push(`heading order or text changed at position ${i}`);
				break;
			}
		}
	}

	const fmBefore = original.match(FRONTMATTER_RE)?.[0];
	const fmAfter = compressed.match(FRONTMATTER_RE)?.[0];
	if (fmBefore && fmBefore !== fmAfter) {
		errors.push("frontmatter drifted");
	}

	const argsBefore = (original.match(ARG_RE) ?? []).length;
	const argsAfter = (compressed.match(ARG_RE) ?? []).length;
	if (argsBefore !== argsAfter) {
		errors.push(`$ARGUMENTS count changed: ${argsBefore} → ${argsAfter}`);
	}

	const bulletsBefore = (original.match(BULLET_RE) ?? []).length;
	const bulletsAfter = (compressed.match(BULLET_RE) ?? []).length;
	if (bulletsBefore > 0) {
		const drift = Math.abs(bulletsBefore - bulletsAfter) / bulletsBefore;
		if (drift > 0.15) {
			warnings.push(
				`bullet count drift ${(drift * 100).toFixed(0)}% (${bulletsBefore} → ${bulletsAfter})`,
			);
		}
	}

	return { ok: errors.length === 0, warnings, errors };
}
