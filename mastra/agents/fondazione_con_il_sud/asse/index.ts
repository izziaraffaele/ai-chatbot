/**
 * Fondazione CON IL SUD - Asse Agent
 *
 * Official AI assistant for Fondazione CON IL SUD, developed by MemorAIz.
 *
 * Purpose:
 * - Answer general questions about the Foundation (mission, areas of intervention, governance)
 * - Guide users through available bandi (announcements)
 * - Help users understand requirements, deadlines, and application procedures
 *
 * Configuration:
 * - Tools:
 *   - fondazioneBandi: list/load bandi (announcements)
 *   - catalog: semantic search over Chairos manual and website KB (pgvector indexed)
 * - Memory configured with LibSQL for conversation history
 * - System prompt in Italian
 *
 * Note: Website KB is no longer injected into the system prompt.
 * The agent uses the "catalog" tool for semantic search over indexed documents.
 */

import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { fondazioneCatalogTool } from "../../../tools/catalog-tool";
import { fondazioneBandiTool } from "../../../tools/fondazione-bandi-tool";
import { sfcAsseSystemPrompt } from "./system-prompt";

/**
 * Fondazione CON IL SUD - Asse Agent
 *
 * Workflow:
 * 1. User asks general question → Agent calls catalog tool for semantic search
 * 2. User asks about bandi → Agent calls fondazioneBandi(mode="list")
 * 3. User selects a bando → Agent calls fondazioneBandi(mode="load", bandoId=...)
 * 4. Agent answers questions about that specific bando
 * 5. User asks detailed procedural questions → Agent calls catalog tool for Chairos/website content
 */
export const sfcAsseAgent = new Agent({
  name: "Assistente Fondazione CON IL SUD – Asse",
  instructions: sfcAsseSystemPrompt,
  model: "openai/gpt-5.1",
  tools: {
    fondazioneBandi: fondazioneBandiTool,
    catalog: fondazioneCatalogTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
