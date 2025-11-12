import { InferUITools } from '@mastra/core/tools';
import { chatAgent } from './chat-agent';

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent['tools']>;

export const mastraAgents = { chatAgent };

/**
 * Agent names for easy reference
 */
export const AGENT_NAMES = {
  CHAT_AGENT: 'chatAgent',
} as const;
