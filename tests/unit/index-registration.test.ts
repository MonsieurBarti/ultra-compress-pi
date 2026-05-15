import { describe, expect, it } from "vitest";

// We test the registration indirectly by inspecting the exported extension function.
// Since `pi` is passed as an argument, we create a mock PI API and verify registrations.

describe("index registration", () => {
	function createMockPi() {
		const commands = new Map<string, unknown>();
		const hooks = new Map<string, unknown>();
		return {
			commands,
			hooks,
			registerCommand(name: string, config: unknown) {
				commands.set(name, config);
			},
			on(event: string, handler: unknown) {
				hooks.set(event, handler);
			},
			sendUserMessage() {},
		};
	}

	it("registers all legacy commands", async () => {
		const { default: extension } = await import("../../src/index.js");
		const pi = createMockPi();
		extension(pi as unknown as Parameters<typeof extension>[0]);
		expect(pi.commands.has("uc")).toBe(true);
		expect(pi.commands.has("uc-file")).toBe(true);
		expect(pi.commands.has("uc-status")).toBe(true);
		expect(pi.commands.has("uc-revert")).toBe(true);
	});

	it("registers new session-compact commands", async () => {
		const { default: extension } = await import("../../src/index.js");
		const pi = createMockPi();
		extension(pi as unknown as Parameters<typeof extension>[0]);
		expect(pi.commands.has("uc-compact")).toBe(true);
		expect(pi.commands.has("uc-recall")).toBe(true);
		expect(pi.commands.has("uc-vcc")).toBe(true);
		expect(pi.commands.has("vcc-recall")).toBe(true);
	});

	it("registers all legacy hooks", async () => {
		const { default: extension } = await import("../../src/index.js");
		const pi = createMockPi();
		extension(pi as unknown as Parameters<typeof extension>[0]);
		expect(pi.hooks.has("session_start")).toBe(true);
		expect(pi.hooks.has("before_agent_start")).toBe(true);
		expect(pi.hooks.has("agent_end")).toBe(true);
		expect(pi.hooks.has("resources_discover")).toBe(true);
	});

	it("registers session_before_compact hook", async () => {
		const { default: extension } = await import("../../src/index.js");
		const pi = createMockPi();
		extension(pi as unknown as Parameters<typeof extension>[0]);
		expect(pi.hooks.has("session_before_compact")).toBe(true);
	});
});
