import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { researchAgentSystemPrompt } from "./system-prompt";

/**
 * Mastra Research Agent
 *
 * Specialized agent for web search and information synthesis.
 *
 * Configuration:
 * - System prompt optimized for research, report synthesis, and hallucination prevention
 * - Google Search tool for executing web queries
 * - Memory configured with LibSQL for maintaining research context across queries
 * - Model can be overridden at agent invocation time
 *
 * **Important:** This agent is designed for agent-to-agent collaboration within the Mastra
 * agent network. It should not be called directly by end users. Other agents can use this
 * to delegate research tasks and retrieve structured research reports.
 *
 * Example usage (from another agent):
 * ```typescript
 * const report = await researchAgent.generate([
 *   {
 *     role: 'user',
 *     content: 'Research the latest developments in quantum computing'
 *   }
 * ]);
 * ```
 */
export const researchAgent = new Agent({
  name: "Researcher",
  instructions: researchAgentSystemPrompt(),
  model: "openai/gpt-5-chat-latest", // Default, can be overridden at runtime
  tools: {
    googleSearch: google.tools.googleSearch({}),
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
  defaultGenerateOptions: {
    maxSteps: 1,
    maxRetries: 1,
  },
  defaultStreamOptions: {
    maxSteps: 1,
    maxRetries: 1,
  },
});
