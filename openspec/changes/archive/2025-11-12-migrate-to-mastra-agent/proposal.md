# Change: Add Mastra Agent for Chat

## Why

The application currently uses the Vercel AI SDK directly in the `/api/chat` endpoint for chat generation. To prepare for a full migration to Mastra's agent framework, we need to create a Mastra agent that replicates all existing AI SDK capabilities. This allows us to test and validate the Mastra implementation in parallel before eventually replacing the AI SDK endpoint.

Mastra provides better agent orchestration, built-in memory management, observability, and workflow capabilities that will enhance the application's AI features in the long term.

## What Changes

- Create a new Mastra chat agent with all capabilities from the current AI SDK implementation
- Port all 4 existing tools to Mastra-compatible format (getWeather, createDocument, updateDocument, requestSuggestions)
- Configure agent with system prompt, model selection, and tool calling
- Integrate tokenlens usage tracking with Mastra agent responses
- Add session and dataStream context handling for tools
- Support both regular and reasoning model modes

## Impact

### Affected specs
- **NEW**: `mastra-agent-integration` - New capability for Mastra agent configuration

### Affected code
- `mastra/agents/` - New chat agent implementation
- `mastra/tools/` - Ported AI SDK tools
- `mastra/index.ts` - Register new chat agent
- No changes to existing `/api/chat` endpoint (parallel implementation)

### Non-goals
- Replacing the `/api/chat` endpoint implementation
- Changing streaming protocol or client interfaces
- Modifying database schema or message storage format
- Altering authentication or rate limiting logic
