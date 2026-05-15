export interface FileActivity {
	read: string[];
	modified: string[];
	created: string[];
}

export interface FileOp {
	type: "read" | "modified" | "created";
	path: string;
}

const READ_TOOLS = ["readFile", "searchFiles", "grep", "listFiles", "cat"];
const WRITE_TOOLS = ["writeFile", "createFile", "mkdir"];
const EDIT_TOOLS = ["editFile", "applyEdit", "replaceText", "patchFile"];

function normalizeFileOps(rawOps: unknown[]): FileOp[] {
	const ops: FileOp[] = [];
	for (const op of rawOps) {
		if (!op || typeof op !== "object") continue;
		const typed = op as Record<string, unknown>;
		const path = typed.path ?? typed.file ?? typed.filePath;
		const type = typed.type ?? typed.operation ?? typed.op;
		if (typeof path !== "string" || !path) continue;

		let opType: FileOp["type"];
		if (typeof type === "string") {
			if (type === "read" || READ_TOOLS.some((t) => type.includes(t))) opType = "read";
			else if (type === "modified" || type === "edit" || EDIT_TOOLS.some((t) => type.includes(t)))
				opType = "modified";
			else if (
				type === "created" ||
				type === "write" ||
				type === "create" ||
				WRITE_TOOLS.some((t) => type.includes(t))
			)
				opType = "created";
			else opType = "read";
		} else {
			opType = "read";
		}
		ops.push({ type: opType, path });
	}
	return ops;
}

function classifyToolCall(name: string): "read" | "modified" | "created" {
	if (READ_TOOLS.some((t) => name === t || name.startsWith(`${t}:`))) return "read";
	if (EDIT_TOOLS.some((t) => name === t || name.startsWith(`${t}:`))) return "modified";
	if (WRITE_TOOLS.some((t) => name === t || name.startsWith(`${t}:`))) return "created";
	return "read";
}

function extractPathsFromToolCall(args: Record<string, unknown>): string[] {
	const paths: string[] = [];
	if (args.path && typeof args.path === "string") paths.push(args.path);
	if (args.paths && Array.isArray(args.paths)) {
		for (const p of args.paths) if (typeof p === "string") paths.push(p);
	}
	if (args.file && typeof args.file === "string") paths.push(args.file);
	if (args.files && Array.isArray(args.files)) {
		for (const f of args.files) if (typeof f === "string") paths.push(f);
	}
	return paths;
}

function trimCommonPrefix(paths: string[]): string[] {
	if (paths.length <= 1) return paths;
	const first = paths[0];
	const last = paths[paths.length - 1];
	if (!first || !last) return paths;

	let i = 0;
	while (i < first.length && i < last.length && first[i] === last[i]) i++;
	const prefix = first.slice(0, i);
	const lastSlash = prefix.lastIndexOf("/");
	if (lastSlash > 0) {
		const common = prefix.slice(0, lastSlash + 1);
		return paths.map((p) => (p.startsWith(common) ? p.slice(common.length) : p));
	}
	return paths;
}

export function extractFileActivity(
	messages: Array<{
		role: string;
		content: string;
		toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
	}>,
	fileOps?: { operations?: unknown[] },
	opts?: { trimPrefix?: boolean },
): FileActivity {
	const read = new Set<string>();
	const modified = new Set<string>();
	const created = new Set<string>();

	// From tool calls in messages
	for (const msg of messages) {
		if (msg.toolCalls) {
			for (const tc of msg.toolCalls) {
				const type = classifyToolCall(tc.name);
				for (const path of extractPathsFromToolCall(tc.arguments ?? {})) {
					if (type === "read") read.add(path);
					else if (type === "modified") modified.add(path);
					else if (type === "created") created.add(path);
				}
			}
		}
	}

	// From explicit fileOps
	if (fileOps?.operations) {
		for (const op of normalizeFileOps(fileOps.operations)) {
			if (op.type === "read") read.add(op.path);
			else if (op.type === "modified") modified.add(op.path);
			else if (op.type === "created") created.add(op.path);
		}
	}

	// Dedup: modified files drop from created
	for (const m of modified) {
		created.delete(m);
	}
	// Read files that were also modified stay in modified only
	for (const m of modified) {
		read.delete(m);
	}

	let result: FileActivity = {
		read: Array.from(read),
		modified: Array.from(modified),
		created: Array.from(created),
	};

	if (opts?.trimPrefix !== false) {
		const allPaths = [...result.read, ...result.modified, ...result.created];
		const trimmed = trimCommonPrefix(allPaths);
		let idx = 0;
		result = {
			read: result.read.map(() => trimmed[idx++] ?? ""),
			modified: result.modified.map(() => trimmed[idx++] ?? ""),
			created: result.created.map(() => trimmed[idx++] ?? ""),
		};
	}

	return result;
}
