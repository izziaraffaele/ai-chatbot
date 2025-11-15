"use client";

import type { ChatToolUIPart } from "@/lib/types";
import { FallbackToolUI } from "./tools";
import { CreateDocumentToolUI } from "./tools/create-document-tool";
import { RequestSuggestionsToolUI } from "./tools/request-suggestions-tool";
import { UpdateDocumentToolUI } from "./tools/update-document-tool";
import { WeatherToolUI } from "./tools/weather-tool";

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
        <WeatherToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-createDocument":
      return (
        <CreateDocumentToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-updateDocument":
      return (
        <UpdateDocumentToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case "tool-requestSuggestions":
      return (
        <RequestSuggestionsToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    default: {
      const clientTools = ["tool-updateDemoConfig"];

      if (clientTools.includes(part.type)) {
        console.log(part);
        return <FallbackToolUI key={part.toolCallId} part={part} />;
      }

      // unsupported tool call
      return null;
    }
  }
}
