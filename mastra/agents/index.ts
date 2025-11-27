import type { InferUITools } from "@mastra/core/tools";
import { chatAgent } from "./chat-agent";
import {
  createInvoiceAnalyzerAgent,
  invoiceAnalyzerAgent,
} from "./invoice-analyzer-agent";
import { researchAgent } from "./research-agent";

export type ChatAgent = typeof chatAgent;
export type ChatAgentTools = InferUITools<ChatAgent["tools"]>;

export type ResearchAgent = typeof researchAgent;
export type ResearchAgentTools = InferUITools<
  Omit<ResearchAgent["tools"], "googleSearch">
>;

export type InvoiceAnalyzerAgent = typeof invoiceAnalyzerAgent;
export type InvoiceAnalyzerAgentTools = InferUITools<
  InvoiceAnalyzerAgent["tools"]
>;

// Export factory function for creating customized analyzers
export { createInvoiceAnalyzerAgent };

export const mastraAgents = { chatAgent, researchAgent, invoiceAnalyzerAgent };
