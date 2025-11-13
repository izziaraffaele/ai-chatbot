import { Agent } from "@mastra/core/agent";
import { researcherAgent } from "@/mastra/agents/researcher-agent";
import { PLANNER_SYSTEM_PROMPT } from "./system-prompt";

/**
 * Mastra Researcher Agent
 *
 * Configuration:
 * - System prompt is a static string
 */
export const plannerAgent = new Agent({
  name: "Planner Agent",
  instructions: PLANNER_SYSTEM_PROMPT,
  model: "google/gemini-2.5-flash", // Default, overridden at runtime
  agents: { researcherAgent },
});
