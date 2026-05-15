import type { TranscriptMessage } from "../types/session-compact.js";

export interface FilterNoiseOptions {
	removeThinking?: boolean;
	stripXml?: boolean;
	noiseToolNames?: string[];
}

const DEFAULT_NOISE_TOOLS = ["readFile", "searchFiles", "grep"];

function stripXmlTags(text: string): string {
	return text.replace(/<\/?[^>]+(>|$)/g, "");
}

function isNoiseTool(toolCall: { name: string }, toolNames?: string[]): boolean {
	const names = toolNames ?? DEFAULT_NOISE_TOOLS;
	return names.some((name) => toolCall.name === name || toolCall.name.startsWith(`${name}:`));
}

export function filterNoise(
	messages: TranscriptMessage[],
	opts: FilterNoiseOptions = {},
): TranscriptMessage[] {
	return messages
		.map((msg): TranscriptMessage | null => {
			// Remove thinking blocks entirely
			if (opts.removeThinking !== false && msg.role === "thinking") {
				return null;
			}

			// Strip XML tags from content
			let content = msg.content;
			if (opts.stripXml !== false) {
				content = stripXmlTags(content);
			}

			// Filter noise tool calls
			const toolCalls = msg.toolCalls?.filter((tc) => !isNoiseTool(tc, opts.noiseToolNames));

			const result: TranscriptMessage = {
				...msg,
				content,
			};
			if (toolCalls !== undefined) {
				result.toolCalls = toolCalls;
			}
			return result;
		})
		.filter((msg): msg is TranscriptMessage => msg !== null);
}
