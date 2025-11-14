import { InferUITools } from '@mastra/core/tools';
import { chatAgent } from './chat-agent';
import { researchAgent } from './research-agent';

export type ChatAgent = typeof chatAgent;
export type ChatAgentUITools = InferUITools<ChatAgent['tools']>;

export type ResearchAgent = typeof researchAgent;
export type ResearchAgentTools = InferUITools<
  Omit<ResearchAgent['tools'], 'googleSearch'>
>;

export const mastraAgents = { chatAgent, researchAgent };

/**
 * Agent names for easy reference
 */
export const AGENT_NAMES = {
  CHAT_AGENT: 'chatAgent',
  RESEARCH_AGENT: 'researchAgent',
} as const;

export type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];
