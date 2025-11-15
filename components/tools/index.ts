/**
 * Tool UI Components
 * Central export point for all tool-specific UI components used in message rendering
 */

import { CreateDocumentToolUI } from "./create-document-tool";
import { RequestSuggestionsToolUI } from "./request-suggestions-tool";

export type { InferToolUIComponentProps, ToolUIComponentProps } from "./types";

import { UpdateDocumentToolUI } from "./update-document-tool";
import { WeatherToolUI } from "./weather-tool";

export const ToolUI = {
  createDocument: CreateDocumentToolUI,
  updateDocument: UpdateDocumentToolUI,
  requestSuggestions: RequestSuggestionsToolUI,
  weather: WeatherToolUI,
};
