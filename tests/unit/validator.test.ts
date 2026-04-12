import { describe, expect, it } from "vitest";
import { validateCompression } from "../../src/services/validator";

describe("validator", () => {
	it("reports ok for identical input", () => {
		const src = "# Heading\n\ntext\n\n```ts\nfoo();\n```\n";
		const r = validateCompression(src, src);
		expect(r.ok).toBe(true);
		expect(r.errors).toEqual([]);
	});

	it("fails when a fenced code block is dropped", () => {
		const src = "pre\n\n```ts\nfoo();\n```\n\npost";
		const out = "pre\n\npost";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.includes("fenced"))).toBe(true);
	});

	it("fails when a URL is missing", () => {
		const src = "see https://example.com";
		const out = "see";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.toLowerCase().includes("url"))).toBe(true);
	});

	it("fails when a heading is missing", () => {
		const src = "# A\n\n## B\n\ntext";
		const out = "# A\n\ntext";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.toLowerCase().includes("heading"))).toBe(true);
	});

	it("fails when frontmatter drifts", () => {
		const src = "---\nname: foo\n---\nbody";
		const out = "---\nname: bar\n---\nbody";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.toLowerCase().includes("frontmatter"))).toBe(true);
	});

	it("warns (not errors) on bullet drift above 15%", () => {
		const src = "- a\n- b\n- c\n- d\n- e\n- f\n- g\n- h\n- i\n- j\n";
		const out = "- a\n- b\n- c\n- d\n- e\n- f\n- g\n- h\n";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(true);
		expect(r.warnings.some((w) => w.toLowerCase().includes("bullet"))).toBe(true);
	});

	it("fails when $ARGUMENTS disappears", () => {
		const src = "runs with $ARGUMENTS applied";
		const out = "runs with applied";
		const r = validateCompression(src, out);
		expect(r.ok).toBe(false);
		expect(r.errors.some((e) => e.includes("$ARGUMENTS"))).toBe(true);
	});
});
