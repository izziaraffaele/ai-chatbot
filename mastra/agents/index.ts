import { InferUITools } from '@mastra/core/tools';
import { chatAgent } from './chat-agent';
import { researcherAgent } from './researcher-agent';
import { plannerAgent } from './planner-agent';
export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent['tools']>;
export type ResearcherAgent = typeof researcherAgent;
export type ResearcherAgentTools = InferUITools<ResearcherAgent['tools']>;
export type PlannerAgent = typeof plannerAgent;
export type PlannerAgentTools = InferUITools<PlannerAgent['tools']>;
export const mastraAgents = { chatAgent, researcherAgent, plannerAgent };

/**
 * Agent names for easy reference
 */
export const AGENT_NAMES = {
  CHAT_AGENT: 'chatAgent',
  RESEARCHER_AGENT: 'researcherAgent',
  PLANNER_AGENT: 'plannerAgent',
} as const;
