/**
 * Invoice Analysis API Route
 *
 * Streams the Invoice Analyzer Agent's analysis of an invoice XML document.
 * Called when a user clicks "Analizza Fattura" on an invalid invoice.
 *
 * The agent searches for missing fields in non-standard XML locations
 * and validates them using the validation tools.
 */

import { toAISdkFormat } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { generateUUID } from "@/lib/utils";
import { createInvoiceAnalyzerAgent } from "@/mastra/agents/faenza/invoice-analyzer-agent";

export const maxDuration = 60;

/**
 * Request body schema for invoice analysis
 */
const analyzeInvoiceSchema = z.object({
  fileId: z.string().describe("The invoice file identifier"),
  xmlContent: z.string().describe("The full XML content of the invoice"),
  missingFields: z
    .array(z.string())
    .describe("List of missing field names to search for"),
});

type AnalyzeInvoiceRequest = z.infer<typeof analyzeInvoiceSchema>;

/**
 * POST /api/analyze-invoice
 *
 * Analyzes an invoice XML to find missing fields in non-standard locations.
 * Streams the agent's analysis process back to the client.
 *
 * @param request - Request with fileId, xmlContent, and missingFields
 * @returns Streaming response with analysis progress and results
 */
export async function POST(request: Request) {
  // 1. Authenticate
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // 2. Parse and validate request body
  let body: AnalyzeInvoiceRequest;
  try {
    const json = await request.json();
    body = analyzeInvoiceSchema.parse(json);
  } catch (error) {
    console.error("Invalid request body:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const { fileId, xmlContent, missingFields } = body;

  // 3. Validate we have something to analyze
  if (missingFields.length === 0) {
    return Response.json(
      { error: "No missing fields to analyze" },
      { status: 400 }
    );
  }

  try {
    // 4. Create analyzer agent configured for the specific missing fields
    const analyzerAgent = createInvoiceAnalyzerAgent(missingFields);

    // 5. Build the analysis prompt
    const analysisPrompt = `Analizza il seguente documento XML di fattura elettronica per trovare i campi mancanti.

**File**: ${fileId}

**Campi da cercare**:
${missingFields.map((f) => `- ${f}`).join("\n")}

**Documento XML**:
\`\`\`xml
${xmlContent}
\`\`\`

Procedi con l'analisi sistematica del documento. Per ogni campo mancante:
1. Cerca il valore in tutto il documento
2. Se trovi un potenziale valore, usa lo strumento di validazione appropriato
3. Riporta il risultato con la posizione esatta nel documento`;

    // 6. Stream the agent's analysis
    const stream = await analyzerAgent.stream(analysisPrompt, {
      telemetry: {
        functionId: "invoice-analyzer-stream",
        isEnabled: true,
      },
    });

    // 7. Create and return the UI message stream
    const uiMessageStream = createUIMessageStream({
      generateId: () => generateUUID(),
      originalMessages: [],
      execute: async ({ writer }) => {
        for await (const part of toAISdkFormat(stream, {
          from: "agent",
        }) as any) {
          writer.write(part);
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: uiMessageStream,
    });
  } catch (error) {
    console.error("Error analyzing invoice:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError("offline:chat").toResponse();
  }
}
