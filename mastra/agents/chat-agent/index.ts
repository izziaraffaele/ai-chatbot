import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { mastraTools } from "../../tools";
import { getGeoHints, getRuntimeConfig } from "../../utils/runtime-utils";
import { invoiceAnalyzerAgent } from "../invoice-analyzer-agent";
import { chatAgentSystemPrompt } from "./system-prompt";
/**
 * Assistente Comune di Faenza
 *
 * Official AI assistant for Comune di Faenza, developed by MemorAIz.
 *
 * Purpose:
 * - List available documents in the knowledge base
 * - Load and display specific documents when requested
 * - Help users understand and work with invoice documents
 * - Create new documents (text, code, spreadsheets)
 * - Update existing documents
 *
 * Configuration:
 * - Tools: createDocument, updateDocument, requestSuggestions, loadInvoice
 * - Memory configured with LibSQL for conversation history
 * - System prompt in Italian, supporting document management and creation
 */
export const chatAgent = new Agent({
  name: "Assistente Comune",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build system prompt for Comune di Faenza assistant
    const prompt = chatAgentSystemPrompt(config, geoHints);

    return prompt;
  },
  model: "openai/gpt-4.1",
  agents: { invoiceAnalyzerAgent },
  tools: {
    createDocument: mastraTools.createDocument,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
    loadInvoice: mastraTools.loadInvoice,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
