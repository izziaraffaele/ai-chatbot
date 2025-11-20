import { getToolName, type ToolUIPart } from "ai";
import { ActivityTool } from "./activity";
import { DocumentTool } from "./document";
import { Fallback } from "./fallback";
import type { ChatToolProps } from "./types";
import { Weather } from "./weather";

export type * from "./types";

export const ToolUI = {
  createActivity: ActivityTool,
  createDocument: DocumentTool,
  updateDocument: DocumentTool,
  requestSuggestions: DocumentTool,
  getWeather: Weather,
};

export const FallbackToolUI = Fallback;

export const getToolUI = (
  part: ToolUIPart,
  fallback: React.ElementType<ChatToolProps> = FallbackToolUI
) => {
  const toolName = getToolName(part);
  const registry = ToolUI as Record<string, React.ElementType<ChatToolProps>>;

  return toolName in ToolUI ? registry[toolName] : fallback;
};
