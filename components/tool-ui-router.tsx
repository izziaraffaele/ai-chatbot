'use client';

import { CreateDocumentToolUI } from './tools/create-document-tool';
import { RequestSuggestionsToolUI } from './tools/request-suggestions-tool';
import type { ChatAgentToolUIPart } from './tools/types';
import { UpdateDocumentToolUI } from './tools/update-document-tool';
import { WeatherToolUI } from './tools/weather-tool';

type ToolUIRouterProps = {
  part: ChatAgentToolUIPart;
  isReadonly?: boolean;
};

/**
 * ToolUIRouter Component
 * Routes tool parts to the appropriate UI component based on tool type
 * Simplifies the rendering logic in PreviewMessage by centralizing tool routing
 */
export function ToolUIRouter({ part, isReadonly = false }: ToolUIRouterProps) {
  switch (part.type) {
    case 'tool-getWeather':
      return (
        <WeatherToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case 'tool-createDocument':
      return (
        <CreateDocumentToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case 'tool-updateDocument':
      return (
        <UpdateDocumentToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    case 'tool-requestSuggestions':
      return (
        <RequestSuggestionsToolUI
          isReadonly={isReadonly}
          key={part.toolCallId}
          part={part}
        />
      );
    default: {
      // TypeScript exhaustiveness check - this should never happen
      const _exhaustiveCheck: never = part;
      return _exhaustiveCheck;
    }
  }
}
