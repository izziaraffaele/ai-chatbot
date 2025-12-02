import type { InferUITools } from "@mastra/core/tools";
import { chatAgent } from "./faenza/invoices-manager";
import { invoiceAnalyzerAgent } from "./faenza/invoice-analyzer-agent";
import { sfcAsseAgent } from "./fondazione_con_il_sud/asse";
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

export type SfcAsseAgent = typeof sfcAsseAgent;
export type SfcAsseAgentTools = InferUITools<SfcAsseAgent["tools"]>;

export { createInvoiceAnalyzerAgent } from "./faenza/invoice-analyzer-agent";

export const mastraAgents = {
  chatAgent,
  researchAgent,
  invoiceAnalyzerAgent,
  sfcAsseAgent,
};
