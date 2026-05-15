export function parseRecallArgs(args: string): { query: string; page: number; expand?: number[] } {
	const trimmed = args.trim();
	if (!trimmed) return { query: "", page: 1 };

	const expandMatch = trimmed.match(/expand:(\d+(?:,\d+)*)/);
	const expand = expandMatch?.[1]
		? expandMatch[1]
				.split(",")
				.map((n) => Number.parseInt(n.trim(), 10))
				.filter((n) => !Number.isNaN(n))
		: undefined;

	const pageMatch = trimmed.match(/page:(\d+)/);
	const page = pageMatch?.[1] ? Number.parseInt(pageMatch[1], 10) : 1;

	const query = trimmed
		.replace(/expand:\d+(?:,\d+)*/g, "")
		.replace(/page:\d+/g, "")
		.trim();

	return { query, page: Number.isNaN(page) || page < 1 ? 1 : page, ...(expand ? { expand } : {}) };
}

export function computeRecentLines(
	entriesLength: number,
	windowSize = 25,
): { offset: number; count: number } {
	const count = Math.min(windowSize, entriesLength);
	const offset = entriesLength - count;
	return { offset, count };
}
