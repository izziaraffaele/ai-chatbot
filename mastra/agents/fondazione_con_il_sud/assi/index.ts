/**
 * Fondazione CON IL SUD - Assi Agent (Internal Assistant)
 *
 * Internal AI assistant for Fondazione CON IL SUD staff, developed by MemorAIz.
 *
 * Purpose:
 * - Help internal staff review and manage documents
 * - Create and update documents (text, code, spreadsheets) using canvas tabs
 * - Access knowledge base for Foundation information
 * - Browse and review bandi (announcements)
 *
 * Configuration:
 * - Tools:
 *   - createDocument: Create text/code/sheet documents in canvas tabs
 *   - updateDocument: Modify existing documents
 *   - requestSuggestions: Provide writing suggestions
 *   - fondazioneBandi: Access Foundation announcements
 *   - catalog: Semantic search over knowledge base
 * - Memory configured with LibSQL for conversation history
 * - System prompt in Italian for internal staff
 *
 * Note: This is the INTERNAL version for Foundation staff.
 * For public-facing assistant, see the "asse" agent.
 */

import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { fondazioneCatalogTool } from "../../../tools/catalog-tool";
import { createDocumentTool } from "../../../tools/create-document-tool";
import { fondazioneBandiTool } from "../../../tools/fondazione-bandi-tool";
import { requestSuggestionsTool } from "../../../tools/request-suggestions-tool";
import { updateDocumentTool } from "../../../tools/update-document-tool";
import { getGeoHints, getRuntimeConfig } from "../../../utils/runtime-utils";
import { sfcAssiSystemPrompt } from "./system-prompt";

/**
 * Fondazione CON IL SUD - Assi Agent (Internal)
 *
 * Workflow:
 * 1. Staff member asks to create a document → Agent calls createDocument
 * 2. Staff asks about bandi → Agent calls fondazioneBandi tool
 * 3. Staff needs Foundation info → Agent calls catalog for semantic search
 * 4. Staff wants to modify document → Agent calls updateDocument
 * 5. Documents open in canvas tabs for simultaneous work
 */
export const sfcAssiAgent = new Agent({
  name: "Assistente Interno Fondazione CON IL SUD – Assi",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build system prompt for internal Fondazione assistant
    return sfcAssiSystemPrompt(config, geoHints);
  },
  model: "openai/gpt-5.1",
  tools: {
    createDocument: createDocumentTool,
    updateDocument: updateDocumentTool,
    requestSuggestions: requestSuggestionsTool,
    fondazioneBandi: fondazioneBandiTool,
    catalog: fondazioneCatalogTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});


