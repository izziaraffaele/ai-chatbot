import { InferUITools } from '@mastra/core/tools';
import { chatAgent } from './chat-agent';
import { systemAgent } from './system-agent';

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent['tools']>;

export type SystemAgent = typeof systemAgent;
export type SystemAgentTools = InferUITools<SystemAgent['tools']>;

export const mastraAgents = { chatAgent, systemAgent };

/**
 * Agent names for easy reference
 */
export const AGENT_NAMES = {
  CHAT_AGENT: 'chatAgent',
  SYSTEM_AGENT: 'systemAgent',
} as const;
