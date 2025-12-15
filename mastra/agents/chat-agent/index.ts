import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { catalogSearchTool } from "@/mastra/tools/schoolr-catalog-tool";
import { mastraTools } from "../../tools";
import { getGeoHints, getRuntimeConfig } from "../../utils/runtime-utils";
import { researchAgent } from "../research-agent";
import { chatAgentSystemPrompt, toolUsageGuidelines } from "./system-prompt";

/**
 * Mastra Chat Agent
 *
 * Configuration:
 * - System prompt dynamically built from runtime config (identity, capabilities, features)
 * - Geolocation hints integrated for contextual responses
 * - All 4 tools registered for real-time document and weather operations
 * - Memory configured with LibSQL for within-session conversation history
 * - Model can be overridden in agent.generate() call during Phase 2 integration
 */
export const chatAgent = new Agent({
  name: "Chat Agent",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build comprehensive system prompt from configuration
    const prompt = chatAgentSystemPrompt(config, geoHints);

    return [
      { role: "system", content: prompt },
      {
        role: "system",
        content:
          toolUsageGuidelines(`- Do not use the createDocument tool or the updateDocument tool more than once in a single conversation.
        - Prefer the catalogSearch tool over the research agent to search for internal materials to suggest to the user.
        - Use the research agent for external researches or to dive deep and expand informations contained in the catalog
        - Do not use the catalogSearch tool for generic questions about the program (e.g. what is the program about?). Only use it for questions specific to a lesson (e.g. what is the objective of this lesson?)`),
      },
    ];
  },
  model: "google/gemini-2.5-flash", // Default, overridden at runtime
  tools: {
    getWeather: mastraTools.getWeather,
    createDocument: mastraTools.createDocument,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
    catalogSearch: catalogSearchTool,
  },
  agents: {
    researchAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
