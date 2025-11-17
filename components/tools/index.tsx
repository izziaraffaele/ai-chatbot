import type { ToolUIPart } from "ai";
import { DocumentTool } from "./document";
import { Fallback } from "./fallback";
import { Weather } from "./weather";

export type ToolUIRender = (props: {
  part: ToolUIPart<any>;
  isReadonly?: boolean;
}) => React.ReactNode;

export const ToolUI: Record<string, ToolUIRender> = {
  "tool-createDocument": DocumentTool,
  "tool-updateDocument": DocumentTool,
  "tool-requestSuggestions": DocumentTool,
  "tool-getWeather": Weather,
};

export const FallbackToolUI = Fallback;
