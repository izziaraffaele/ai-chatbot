import type { InferUITools } from "@mastra/core/tools";
import { chatAgent } from "./chat-agent";
import { plannerAgent } from "./planner-agent";
import { researchAgent } from "./research-agent";

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent["tools"]>;

export type PlannerAgent = typeof plannerAgent;
export type PlannerAgentTools = InferUITools<PlannerAgent["tools"]>;

export type ResearchAgent = typeof researchAgent;
export type ResearchAgentTools = InferUITools<
  Omit<ResearchAgent["tools"], "googleSearch">
>;

export const mastraAgents = { chatAgent, plannerAgent, researchAgent };
