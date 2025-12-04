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
import { listVideosTool } from "./list-videos-tool";
import { loadInvoiceTool } from "./load-invoice-tool";
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
export type LoadInvoiceTool = typeof loadInvoiceTool;
export type ListVideosTool = typeof listVideosTool;

// Invoice validation tool types
export type {
  InvoiceValidationTools,
  ValidationOutput,
} from "./invoice-validation-tools";

/**
 * All Mastra Tools Union Type
 */
export type MastraToolTypes =
  | GetWeatherTool
  | CreateDocumentTool
  | UpdateDocumentTool
  | RequestSuggestionsTool
  | LoadInvoiceTool
  | ListVideosTool;

/**
 * Tools Map
 * Used for agent tool registration
 */
export const mastraTools = {
  getWeather: getWeatherTool,
  createDocument: createDocumentTool,
  updateDocument: updateDocumentTool,
  requestSuggestions: requestSuggestionsTool,
  loadInvoice: loadInvoiceTool,
  listVideos: listVideosTool,
};

/**
 * Invoice Validation Tools
 * Used by the Invoice Analyzer Agent
 */
export {
  invoiceValidationTools,
  validateCigTool,
  validateCodiceFiscaleTool,
  validateCodicePaTool,
  validateCupTool,
  validateIbanTool,
} from "./invoice-validation-tools";

/**
 * Tool names for easy reference
 */
export const TOOL_NAMES = {
  GET_WEATHER: "getWeather",
  CREATE_DOCUMENT: "createDocument",
  UPDATE_DOCUMENT: "updateDocument",
  REQUEST_SUGGESTIONS: "requestSuggestions",
  LOAD_INVOICE: "loadInvoice",
  LIST_VIDEOS: "listVideos",
  // Invoice validation tools
  VALIDATE_IBAN: "validateIban",
  VALIDATE_CIG: "validateCig",
  VALIDATE_CUP: "validateCup",
  VALIDATE_CODICE_FISCALE: "validateCodiceFiscale",
  VALIDATE_CODICE_PA: "validateCodicePa",
} as const;
