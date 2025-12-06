import type { InferUITools } from "@mastra/core/tools";
import { quizAgent } from "./hfarm/quiz-agent";
import { chatAgent } from "./hfarm/student-assistant";
import { researchAgent } from "./research-agent";

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent["tools"]>;

export type ResearchAgent = typeof researchAgent;
export type ResearchAgentTools = InferUITools<
  Omit<ResearchAgent["tools"], "googleSearch">
>;

export type QuizAgent = typeof quizAgent;

export const mastraAgents = {
  chatAgent,
  researchAgent,
  quizAgent,
};
