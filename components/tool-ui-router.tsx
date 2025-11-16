"use client";

import { isToolUIPart, type UIMessagePart } from "ai";
import type { ChatToolUIPart } from "@/lib/types";
import { ToolUI } from "./tools";
import { FallbackToolUI } from "./tools/fallback-tool";

type ToolUIRouterProps = {
  part: ChatToolUIPart;
  isReadonly?: boolean;
};

/**
 * ToolUIRouter Component
 * Routes tool parts to the appropriate UI component based on tool type
 * Simplifies the rendering logic in PreviewMessage by centralizing tool routing
 */
export function ToolUIRouter({ part, isReadonly = false }: ToolUIRouterProps) {
  switch (part.type) {
    case "tool-getWeather":
      return (
        <ToolUI.weather
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-createDocument":
      return (
        <ToolUI.createDocument
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-updateDocument":
      return (
        <ToolUI.updateDocument
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-requestSuggestions":
      return (
        <ToolUI.requestSuggestions
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    default: {
      const _part = part as UIMessagePart<any, any>;
      if (isToolUIPart(_part)) {
        return <FallbackToolUI key={_part.toolCallId} part={part} />;
      }

      // unsupported tool call
      return null;
    }
  }
}
