import type { AutocompleteItem } from "@mariozechner/pi-tui";

export type { AutocompleteItem }; // re-export so downstream imports from this module still work

export interface CommandUI {
	notify(message: string, level?: "info" | "warning" | "error"): void;
}

export interface SessionManagerLike {
	getSessionFile(): string | undefined;
}

export interface CommandContext {
	cwd: string;
	ui: CommandUI;
	sessionManager?: SessionManagerLike;
}

export interface CommandDefinition {
	name: string;
	description: string;
	handler(args: string, ctx: CommandContext): Promise<void>;
	getArgumentCompletions?(prefix: string): AutocompleteItem[] | null;
}
