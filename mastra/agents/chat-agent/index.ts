import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import {
  getWeatherTool,
  createDocumentTool,
  updateDocumentTool,
  requestSuggestionsTool,
} from '../../tools';
import { getRuntimeConfig, getGeoHints } from '../../utils/runtime-utils';
import { chatAgentSystemPrompt } from './system-prompt';

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
  name: 'Chat Agent',
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build comprehensive system prompt from configuration
    const prompt = chatAgentSystemPrompt(config, geoHints);

    return prompt;
  },
  model: 'google/gemini-2.5-flash', // Default, overridden at runtime
  tools: {
    getWeather: getWeatherTool,
    createDocument: createDocumentTool,
    updateDocument: updateDocumentTool,
    requestSuggestions: requestSuggestionsTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});
