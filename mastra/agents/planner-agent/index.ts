import { Agent } from "@mastra/core/agent";
import { getGeoHints, getRuntimeConfig } from "../../utils/runtime-utils";
import { researchAgent } from "../research-agent";
import { plannerAgentSystemPrompt } from "./system-prompt";

/**
 * Mastra Planner Agent
 *
 * Configuration:
 * - System prompt dynamically built from runtime config (identity, capabilities, features)
 * - Geolocation hints integrated for contextual planning (especially for travel)
 * - Collaborates with Research Agent for evidence-based planning
 * - Model can be overridden at runtime
 */
export const plannerAgent = new Agent({
  name: "Planner Agent",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build comprehensive system prompt from configuration
    const prompt = plannerAgentSystemPrompt(config, geoHints);

    return prompt;
  },
  model: "openai/gpt-4.1",
  agents: { researchAgent },
  defaultStreamOptions: {
    maxSteps: 30,
  },
});
