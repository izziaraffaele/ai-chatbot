/**
 * Invoice Analyzer Agent
 *
 * Specialized agent for analyzing FatturaElettronica XML documents
 * to find missing fields in non-standard locations and validate them.
 *
 * This agent is designed to be called by the UI when a user clicks
 * "Analizza Fattura" on an invalid invoice. It uses LLM capabilities
 * to search through the XML and validation tools to verify found values.
 *
 * Key features:
 * - Searches entire XML document for missing fields
 * - Uses validation tools to verify extracted values
 * - Streams analysis progress to UI
 * - Returns validated findings with XML locations
 */

import { Agent } from "@mastra/core/agent";
import { invoiceValidationTools } from "../../tools/invoice-validation-tools";
import { invoiceAnalyzerSystemPrompt } from "./system-prompt";

/**
 * Creates an Invoice Analyzer Agent configured for specific missing fields
 *
 * This function creates a new agent instance configured to search for
 * the specified missing fields. Each analysis session should create
 * a new agent with the relevant missing fields.
 *
 * @param missingFields - Array of field names to search for
 * @returns Configured Agent instance
 *
 * @example
 * ```typescript
 * const agent = createInvoiceAnalyzerAgent(["CUP", "IBAN"]);
 * const stream = await agent.stream(`Analizza questo XML: ${xmlContent}`);
 * ```
 */
export function createInvoiceAnalyzerAgent(missingFields: string[]): Agent {
  return new Agent({
    name: "Invoice Analyzer",
    instructions: invoiceAnalyzerSystemPrompt(missingFields),
    model: "openai/gpt-4.1-nano",
    tools: invoiceValidationTools,
    // No memory - this is a stateless analysis agent
  });
}

/**
 * Default Invoice Analyzer Agent
 *
 * Pre-configured agent that can search for all possible missing fields.
 * Use this when you want to analyze an invoice without knowing which
 * fields are missing in advance.
 *
 * This agent is called by the main chat agent when the user requests
 * analysis of an invalid invoice to find missing fields.
 */
export const invoiceAnalyzerAgent = new Agent({
  name: "Invoice Analyzer",
  description: `Agente specializzato per l'analisi approfondita di fatture elettroniche XML.
    Usa questo agente quando l'utente chiede di "analizzare una fattura" per trovare
    campi mancanti come IBAN, CIG, CUP, Codice Fiscale, o Codice PA.
    L'agente cerca i valori in posizioni non standard del documento XML e li valida.
    Richiede il fileId della fattura e l'elenco dei campi mancanti da cercare.`,
  instructions: invoiceAnalyzerSystemPrompt([
    "IBAN",
    "CIG (Codice Identificativo Gara)",
    "CUP (Codice Unico di Progetto)",
    "Codice Fiscale Fornitore",
    "Codice Destinatario PA",
  ]),
  model: "openai/gpt-4.1",
  tools: invoiceValidationTools,
});
