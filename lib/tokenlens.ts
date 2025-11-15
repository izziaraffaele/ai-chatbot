/**
 * Tokenlens Integration Utilities
 *
 * Provides utilities for enriching usage data with tokenlens
 * model catalog information for comprehensive token counting and cost tracking.
 * Compatible with both AI SDK and Mastra agent responses.
 */

import { unstable_cache as cache } from "next/cache";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { AppUsage } from "@/lib/usage";

/**
 * Cached tokenlens model catalog fetcher
 * Revalidates every 24 hours to keep model data up-to-date
 */
const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

/**
 * Usage data from Mastra agent response
 */
export type MastraUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

/**
 * Enriches Mastra agent usage data with tokenlens catalog information
 *
 * Converts raw token counts from the model API into enriched usage data
 * that includes cost estimates and other model-specific information
 * from the tokenlens catalog.
 *
 * @param modelId - The ID/name of the model used for generation
 * @param usage - Raw usage data from Mastra agent response
 * @returns Enriched usage data with tokenlens information, or null if enrichment fails
 *
 * @example
 * ```typescript
 * const response = await chatAgent.generate({...});
 * const enrichedUsage = await enrichUsageWithTokenlens('grok-beta', response.usage);
 * if (enrichedUsage) {
 *   dataStream.write({ type: 'data-usage', data: enrichedUsage });
 * }
 * ```
 */
export async function enrichUsageWithTokenlens(
  modelId: string,
  usage: MastraUsage
): Promise<AppUsage | null> {
  try {
    // Fetch the tokenlens model catalog
    const catalog = await getTokenlensCatalog();

    // If catalog is not available, return raw usage
    if (!catalog) {
      return {
        ...usage,
        modelId,
      } as AppUsage;
    }

    // Use tokenlens to enrich usage data with cost and model information
    const summary = getUsage({ modelId, usage, providers: catalog });

    // Merge enriched data with original usage
    const enrichedUsage: AppUsage = {
      ...usage,
      ...summary,
      modelId,
    } as AppUsage;

    return enrichedUsage;
  } catch (error) {
    console.warn("TokenLens enrichment failed:", error);
    // Fallback to raw usage data
    return {
      ...usage,
      modelId,
    } as AppUsage;
  }
}

/**
 * Handles usage tracking for Mastra agent responses
 *
 * Suitable for use after agent.generate() completes.
 * Enriches usage data and writes it to the dataStream for client consumption.
 *
 * @param modelId - The ID/name of the model used
 * @param usage - Raw usage data from agent response
 * @param dataStream - DataStream writer for sending usage events to client
 *
 * @example
 * ```typescript
 * const response = await chatAgent.generate({
 *   messages: [...],
 *   runtimeContext,
 * });
 *
 * await trackUsage('grok-beta', response.usage, dataStream);
 * ```
 */
export async function trackUsage(
  modelId: string,
  usage: MastraUsage,
  dataStream?: { write: (event: any) => void }
): Promise<AppUsage | null> {
  // Enrich usage data with tokenlens
  const enrichedUsage = await enrichUsageWithTokenlens(modelId, usage);

  // Write to dataStream if available
  if (dataStream && enrichedUsage) {
    try {
      dataStream.write({
        type: "data-usage",
        data: enrichedUsage,
      });
    } catch (err) {
      console.warn("Failed to write usage to dataStream:", err);
    }
  }

  return enrichedUsage;
}

/**
 * Safe usage tracking wrapper
 *
 * Handles errors gracefully and logs them instead of throwing.
 * Useful for non-critical operations where failures shouldn't interrupt main flow.
 *
 * @param modelId - The ID/name of the model used
 * @param usage - Raw usage data from agent response
 * @param dataStream - Optional DataStream writer
 */
export async function safeTrackUsage(
  modelId: string,
  usage: MastraUsage,
  dataStream?: { write: (event: any) => void }
): Promise<void> {
  try {
    await trackUsage(modelId, usage, dataStream);
  } catch (error) {
    console.error("Error tracking usage:", error);
  }
}
