/**
 * Mastra Tools Module
 *
 * Exports all Mastra-compatible tools with inferred type definitions.
 * Tools receive context via Mastra's tool execution system:
 * - context: Validated input parameters from Zod schema
 * - runtimeContext: Runtime data (session, user, etc.)
 * - writer: DataStream writer for real-time UI updates
 */

import { createDocumentTool } from "./create-document-tool";
import { createPFBuilderTool } from "./create-pf-builder-tool";
import { createTrainingPathTool } from "./create-training-path-tool";
import { requestSuggestionsTool } from "./request-suggestions-tool";
import { updateDocumentTool } from "./update-document-tool";
import { getWeatherTool } from "./weather-tool";

/**
 * Inferred Tool Types
 * These types are automatically inferred from the tool definitions using Mastra's type utilities
 */
export type GetWeatherTool = typeof getWeatherTool;
export type CreateDocumentTool = typeof createDocumentTool;
export type CreateTrainingPathTool = typeof createTrainingPathTool;
export type CreatePFBuilderTool = typeof createPFBuilderTool;
export type UpdateDocumentTool = typeof updateDocumentTool;
export type RequestSuggestionsTool = typeof requestSuggestionsTool;

/**
 * All Mastra Tools Union Type
 */
export type MastraToolTypes =
  | GetWeatherTool
  | CreateDocumentTool
  | CreateTrainingPathTool
  | CreatePFBuilderTool
  | UpdateDocumentTool
  | RequestSuggestionsTool;

/**
 * Tools Map
 * Used for agent tool registration
 */
export const mastraTools = {
  getWeather: getWeatherTool,
  createDocument: createDocumentTool,
  createTrainingPath: createTrainingPathTool,
  createPFBuilder: createPFBuilderTool,
  updateDocument: updateDocumentTool,
  requestSuggestions: requestSuggestionsTool,
};

/**
 * Tool names for easy reference
 */
export const TOOL_NAMES = {
  GET_WEATHER: "getWeather",
  CREATE_DOCUMENT: "createDocument",
  CREATE_TRAINING_PATH: "createTrainingPath",
  CREATE_PF_BUILDER: "createPFBuilder",
  UPDATE_DOCUMENT: "updateDocument",
  REQUEST_SUGGESTIONS: "requestSuggestions",
} as const;
