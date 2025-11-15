/**
 * Mastra Tools Module
 *
 * Exports all Mastra-compatible tools with inferred type definitions.
 * Tools receive context via Mastra's tool execution system:
 * - context: Validated input parameters from Zod schema
 * - runtimeContext: Runtime data (session, user, etc.)
 * - writer: DataStream writer for real-time UI updates
 */

import type { InferUITool } from "@mastra/core/tools";
import { createDocumentTool } from "./create-document-tool";
import { requestSuggestionsTool } from "./request-suggestions-tool";
import { updateDocumentTool } from "./update-document-tool";
import { getWeatherTool } from "./weather-tool";

/**
 * Inferred Tool Types
 * These types are automatically inferred from the tool definitions using Mastra's type utilities
 */
export type GetWeatherTool = InferUITool<typeof getWeatherTool>;
export type CreateDocumentTool = InferUITool<typeof createDocumentTool>;
export type UpdateDocumentTool = InferUITool<typeof updateDocumentTool>;
export type RequestSuggestionsTool = InferUITool<typeof requestSuggestionsTool>;

/**
 * All Mastra Tools Union Type
 */
export type MastraToolTypes =
  | GetWeatherTool
  | CreateDocumentTool
  | UpdateDocumentTool
  | RequestSuggestionsTool;

/**
 * Tools Map
 * Used for agent tool registration
 */
export const mastraTools = {
  getWeather: getWeatherTool,
  createDocument: createDocumentTool,
  updateDocument: updateDocumentTool,
  requestSuggestions: requestSuggestionsTool,
};

/**
 * Tool names for easy reference
 */
export const TOOL_NAMES = {
  GET_WEATHER: "getWeather",
  CREATE_DOCUMENT: "createDocument",
  UPDATE_DOCUMENT: "updateDocument",
  REQUEST_SUGGESTIONS: "requestSuggestions",
} as const;
