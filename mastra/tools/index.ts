/**
 * Mastra Tools Module
 *
 * Exports all Mastra-compatible tools with inferred type definitions.
 * Tools receive context via Mastra's tool execution system:
 * - context: Validated input parameters from Zod schema
 * - runtimeContext: Runtime data (session, user, etc.)
 * - writer: DataStream writer for real-time UI updates
 */

import {
  type FondazioneCatalogTool,
  fondazioneCatalogTool,
} from "./catalog-tool";
import { createDocumentTool } from "./create-document-tool";
import { fondazioneBandiTool } from "./fondazione-bandi-tool";
import { fondazioneBrowserTool } from "./fondazione-fs-tool";
import { requestSuggestionsTool } from "./request-suggestions-tool";
import { updateDocumentTool } from "./update-document-tool";
import { getWeatherTool } from "./weather-tool";

/**
 * Inferred Tool Types
 * These types are automatically inferred from the tool definitions using Mastra's type utilities
 */
export type GetWeatherTool = typeof getWeatherTool;
export type CreateDocumentTool = typeof createDocumentTool;
export type UpdateDocumentTool = typeof updateDocumentTool;
export type RequestSuggestionsTool = typeof requestSuggestionsTool;
export type FondazioneBandiTool = typeof fondazioneBandiTool;
export type FondazioneBrowserTool = typeof fondazioneBrowserTool;
export type { FondazioneCatalogTool };

/**
 * All Mastra Tools Union Type
 */
export type MastraToolTypes =
  | GetWeatherTool
  | CreateDocumentTool
  | UpdateDocumentTool
  | RequestSuggestionsTool
  | FondazioneBandiTool
  | FondazioneBrowserTool
  | FondazioneCatalogTool;

/**
 * Tools Map
 * Used for agent tool registration
 */
export const mastraTools = {
  getWeather: getWeatherTool,
  createDocument: createDocumentTool,
  updateDocument: updateDocumentTool,
  requestSuggestions: requestSuggestionsTool,
  fondazioneBandi: fondazioneBandiTool,
  fondazioneBrowser: fondazioneBrowserTool,
  catalog: fondazioneCatalogTool,
};

/**
 * Tool names for easy reference
 */
export const TOOL_NAMES = {
  GET_WEATHER: "getWeather",
  CREATE_DOCUMENT: "createDocument",
  UPDATE_DOCUMENT: "updateDocument",
  REQUEST_SUGGESTIONS: "requestSuggestions",
  FONDAZIONE_BANDI: "fondazioneBandi",
  FONDAZIONE_BROWSER: "fondazioneBrowser",
  CATALOG: "catalog",
} as const;
