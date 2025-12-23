import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { catalogSearchTool } from "@/mastra/tools/schoolr-catalog-tool";
import { mastraTools } from "../../tools";
import {
  getGeoHints,
  getPFBuilderState,
  getRuntimeConfig,
} from "../../utils/runtime-utils";
import { figureSuggesterAgent } from "../figure-suggester-agent";
import {
  buildPFBuilderContextPrompt,
  chatAgentSystemPrompt,
  toolUsageGuidelines,
} from "./system-prompt";

/**
 * Mastra Chat Agent
 *
 * Configuration:
 * - System prompt dynamically built from runtime config (identity, capabilities, features)
 * - Geolocation hints integrated for contextual responses
 * - PF Builder state awareness for canvas-chat synchronization
 * - All 4 tools registered for real-time document and weather operations
 * - Memory configured with LibSQL for within-session conversation history
 * - Model can be overridden in agent.generate() call during Phase 2 integration
 */
export const chatAgent = new Agent({
  name: "Assistente interno Pegaso",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    const pfBuilderState = getPFBuilderState(runtimeContext);

    // Build comprehensive system prompt from configuration
    const prompt = chatAgentSystemPrompt(config, geoHints);

    // Build PF Builder context prompt if builder is active
    const pfBuilderContextPrompt = buildPFBuilderContextPrompt(pfBuilderState);

    // Build messages array with system prompt
    // Note: Tool policy and PF Builder rules are now in chatAgentSystemPrompt
    const messages: Array<{ role: "system"; content: string }> = [
      { role: "system", content: prompt },
    ];

    // Add minimal supplementary guidelines if needed
    const supplementaryGuidelines = toolUsageGuidelines(
      `### catalogSearch - Parametri chiave

**Filtri opzionali per risultati mirati:**
- \`keywords\`: ["web", "database"] - filtra per parole chiave (match parziale, case-insensitive)
- \`settore\`: "informatica" - filtra per settore esatto
- \`figuraProfessionale\`: "Tecnico" - filtra ADA per figura (match parziale)

**Esempi rapidi:**
- Panoramica settore: \`{ query: "figure IT", collection: "figure", mode: "explore", settore: "informatica" }\`
- ADA specifiche: \`{ query: "database SQL", collection: "ada", mode: "content", keywords: ["database", "SQL"] }\`
- Figure con keyword: \`{ query: "sviluppatore", collection: "figure", mode: "content", keywords: ["web", "frontend"] }\``
    );
    messages.push({ role: "system", content: supplementaryGuidelines });

    // Add PF Builder context if available
    if (pfBuilderContextPrompt) {
      messages.push({ role: "system", content: pfBuilderContextPrompt });
    }

    return messages;
  },
  model: "openai/gpt-4.1", // Default, overridden at runtime
  tools: {
    getWeather: mastraTools.getWeather,
    createDocument: mastraTools.createDocument,
    createTrainingPath: mastraTools.createTrainingPath,
    createPFBuilder: mastraTools.createPFBuilder,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
    catalogSearch: catalogSearchTool,
  },
  agents: {
    figureSuggesterAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
