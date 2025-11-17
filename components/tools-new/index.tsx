import { CreateDocument } from "./create-document";
import { Fallback } from "./fallback";
import { RequestSuggestions } from "./request-suggestions";
import { UpdateDocument } from "./update-document";
import { Weather } from "./weather";

export const ToolUI = {
  "tool-createDocument": CreateDocument,
  "tool-updateDocument": UpdateDocument,
  "tool-requestSuggestions": RequestSuggestions,
  "tool-getWeather": Weather,
};

export const FallbackToolUI = Fallback;
