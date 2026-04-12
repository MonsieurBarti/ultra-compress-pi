// Canonical backup path for ultra-compress — always appends ".original.md"
// regardless of the source extension. Matches the spec literally and keeps
// the collision check trivial (single filename per source).
export function backupPathFor(abs: string): string {
	return `${abs}.original.md`;
}
