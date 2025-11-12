import type { ModelCatalog } from "tokenlens/core";
import { getUsage } from "tokenlens/helpers";
import type { UIMessageStreamWriter } from "ai";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { myProvider } from "@/lib/ai/providers";

/**
 * Handle usage tracking from Mastra agent response
 * Enriches usage data with tokenlens information if available
 */
export async function handleAgentUsage(
  agentResponse: any,
  dataStream: UIMessageStreamWriter<ChatMessage>,
  selectedChatModel: string,
  tokenLensCatalog?: ModelCatalog
): Promise<AppUsage | undefined> {
  try {
    // Extract usage from Mastra response
    // Mastra agent responses may have different structure
    const usage = agentResponse?.usage || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    let finalUsage: AppUsage = usage;

    // Try to enrich with tokenlens if catalog is available
    if (tokenLensCatalog) {
      try {
        const modelId = myProvider.languageModel(selectedChatModel).modelId;

        if (modelId) {
          const summary = getUsage({
            modelId,
            usage,
            providers: tokenLensCatalog,
          });
          finalUsage = { ...usage, ...summary, modelId } as AppUsage;
        }
      } catch (err) {
        console.warn("TokenLens enrichment failed", err);
        // Continue with raw usage data
      }
    }

    // Write usage to dataStream
    dataStream.write({
      type: "data-usage",
      data: finalUsage,
    });

    return finalUsage;
  } catch (err) {
    console.warn("Error handling agent usage", err);
    return undefined;
  }
}

/**
 * Convert Mastra agent response to UI message format
 * Extracts text content and metadata from agent response
 */
export function convertAgentResponseToMessage(
  agentResponse: any
): Partial<ChatMessage> {
  // Mastra agents return structured responses
  // Extract the main text content and any tool calls

  const content = agentResponse?.text || agentResponse?.content || "";
  const id = agentResponse?.id || "";
  const role = "assistant" as const;

  // Build parts array similar to AI SDK format
  const parts: ChatMessage["parts"] = [];

  if (content) {
    parts.push({
      type: "text",
      text: content,
    });
  }

  return {
    id,
    role,
    parts,
  };
}

/**
 * Type guard to check if response is a streaming response
 */
export function isStreamingResponse(response: any): boolean {
  return (
    response &&
    typeof response === "object" &&
    (typeof response.getReader === "function" ||
      Symbol.asyncIterator in response)
  );
}

/**
 * Format error response for dataStream
 */
export function formatErrorForStream(error: Error | unknown): {
  type: string;
  data: string;
} {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred";

  return {
    type: "data-error",
    data: message,
  };
}
