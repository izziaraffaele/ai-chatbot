import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { mastraTools } from "../../../tools";
import {
  getCanvasContext,
  getGeoHints,
  getRuntimeConfig,
} from "../../../utils/runtime-utils";
import { quizAgent } from "../quiz-agent";
import { hfarmAssistantSystemPrompt } from "./system-prompt";

/**
 * H-FARM Student Assistant
 *
 * Official AI assistant for H-FARM, the Italian innovation hub and university.
 *
 * Purpose:
 * - Help students explore H-FARM's courses and programs
 * - Provide information about campus life and services
 * - Assist with learning materials and educational content
 * - Support students with general university-related questions
 * - Browse and watch video content from H-FARM courses
 * - Generate interactive quizzes via the Quiz Generator sub-agent
 *
 * Configuration:
 * - Tools: listVideos, seekVideo, hfarmCatalog (semantic search over knowledge base)
 * - Sub-agents: quizAgent (for interactive quiz generation)
 * - Memory configured with LibSQL for conversation history
 * - Bilingual support (Italian/English)
 */
export const chatAgent = new Agent({
  name: "H-FARM Assistant",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration, geolocation hints, and canvas context
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);
    const canvasContext = getCanvasContext(runtimeContext);

    // Build system prompt for H-FARM student assistant
    const prompt = hfarmAssistantSystemPrompt(config, geoHints, canvasContext);

    return prompt;
  },
  model: "openai/gpt-5-chat-latest",
  tools: {
    listVideos: mastraTools.listVideos,
    seekVideo: mastraTools.seekVideo,
    hfarmCatalog: mastraTools.hfarmCatalog,
  },
  agents: {
    quizAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
