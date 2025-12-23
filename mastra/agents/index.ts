import type { InferUITools } from "@mastra/core/tools";
import { chatAgent } from "./chat-agent";
import { figureSuggesterAgent } from "./figure-suggester-agent";

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent["tools"]>;

export type FigureSuggesterAgent = typeof figureSuggesterAgent;

export const mastraAgents = { chatAgent, figureSuggesterAgent };
