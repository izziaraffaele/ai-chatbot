import type { InferUITools } from "@mastra/core/tools";
import { sfcAsseAgent } from "./fondazione_con_il_sud/asse";
import { sfcAssiAgent } from "./fondazione_con_il_sud/assi";
import { researchAgent } from "./research-agent";

export type ResearchAgent = typeof researchAgent;
export type ResearchAgentTools = InferUITools<
  Omit<ResearchAgent["tools"], "googleSearch">
>;

export type SfcAsseAgent = typeof sfcAsseAgent;
export type SfcAsseAgentTools = InferUITools<SfcAsseAgent["tools"]>;

export type SfcAssiAgent = typeof sfcAssiAgent;
export type SfcAssiAgentTools = InferUITools<SfcAssiAgent["tools"]>;

export const mastraAgents = {
  researchAgent,
  sfcAsseAgent,
  sfcAssiAgent,
};
