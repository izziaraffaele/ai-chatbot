import { Agent } from "@mastra/core/agent";
import { webSearchTool } from "@/mastra/tools";
import { RESEARCHER_SYSTEM_PROMPT } from "./system-prompt";

/**
 * Mastra Researcher Agent
 *
 * Configuration:
 * - System prompt is a static string
 */
export const researcherAgent = new Agent({
  name: "Researcher Agent",
  instructions: RESEARCHER_SYSTEM_PROMPT,
  model: "openai/gpt-4.1", 
  tools: { webSearch: webSearchTool },
});
