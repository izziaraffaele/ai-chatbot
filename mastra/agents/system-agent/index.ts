import { Agent } from '@mastra/core/agent';

export const systemAgent = new Agent({
  name: 'System Agent',
  instructions: `You are background system agent. Keep answer answers short and concise.`,
  model: 'google/gemini-2.5-flash-lite',
});
