# Change: Refactor Artifacts System to Use Mastra Agents

## Why

The artifacts system currently uses AI SDK's `streamObject` directly, which is inconsistent with the chat endpoint that was migrated to Mastra agents. By adopting Mastra agents for artifact generation, we achieve:

- **Consistency**: Both chat and artifact generation use the same Mastra agent abstraction
- **Maintainability**: Single agent model for all AI operations simplifies code and reduces duplication
- **Stream Alignment**: Event-based streaming via data stream writer is now uniform across the system
- **Future Extensibility**: Agent-based architecture allows for shared plugins, memory, and tool context across different systems

## What Changes

- Extend `createDocumentHandler` config to accept optional `model` parameter for language model selection
- Create internal document expert agents within `createDocumentHandler` for each artifact type (text, code, sheet)
- Simplify artifact streaming by using Mastra `agent.stream().textStream` for all artifact types (code, sheet, text are all text output)
- Remove dependency on `streamObject` and Zod schemas from artifact handlers (validation moved to agent prompts)
- Update `CreateDocumentCallbackProps` and `UpdateDocumentCallbackProps` to include agent parameter
- Replace delta emission with event-based streaming via `dataStream.write()` calls
- Maintain backward compatibility in the document handler interface (agents are internal implementation detail)

## Impact

- **Affected specs**: `mastra-agent-integration` (extends existing agent capabilities to artifacts)
- **Affected code**:
  - `lib/artifacts/server.ts` - createDocumentHandler function
  - `artifacts/text/server.ts` - text document handler
  - `artifacts/code/server.ts` - code document handler
  - `artifacts/sheet/server.ts` - sheet document handler
  - `app/(chat)/api/document/route.ts` - document API endpoint
- **No breaking changes**: Document handler interface remains unchanged; agents are internal implementation detail
