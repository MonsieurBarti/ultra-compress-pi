export interface AutocompleteItem {
	value: string;
	label: string;
}

export interface CommandUI {
	notify(message: string, level?: "info" | "warning" | "error"): void;
}

export interface CommandContext {
	cwd: string;
	ui: CommandUI;
	model?: unknown;
	modelRegistry?: unknown;
	signal?: AbortSignal;
}

export interface CommandDefinition {
	name: string;
	description: string;
	handler(args: string, ctx: CommandContext): Promise<void>;
	getArgumentCompletions?(prefix: string): AutocompleteItem[] | null;
}
