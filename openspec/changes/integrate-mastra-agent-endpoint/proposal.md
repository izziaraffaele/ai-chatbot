# Change: Replace Chat Endpoint with Mastra Agent

## Why

Phase 1 created a fully-featured Mastra chat agent with all capabilities from the existing AI SDK implementation. Phase 2 directly replaces the `/api/chat` endpoint with the Mastra agent, eliminating duplicate code paths and enabling Mastra's advanced features in the production chat flow.

This is a complete migration from Vercel AI SDK's `streamText()` to Mastra's `agent.stream()`, maintaining full backward compatibility with the existing frontend through proper stream format conversion.

## What Changes

### Endpoint Replacement
- Replace AI SDK `streamText()` in `/app/(chat)/api/chat/route.ts` with Mastra `agent.stream()`
- Remove all AI SDK-specific imports and logic from the chat endpoint
- Leverage Mastra's native tool streaming (no custom dataStream needed)
- Use `format: "aisdk"` in `agent.stream()` for client compatibility

### Runtime Context Injection
- Extract user session from Next.js `auth()` helper
- Extract chat context (chatId, userId) from request body
- Create RuntimeContext using `@mastra/utils/runtime-utils.ts`
- Pass RuntimeContext to agent with session and chat metadata for tools

### tokenlens Integration
- Extract token usage from Mastra response metadata
- Enrich with tokenlens catalog (model costs, variants)
- Write enriched usage data to stream for UI consumption

### Error Handling
- Catch Mastra agent errors and convert to client-friendly error messages
- Handle stream interruptions gracefully
- Log errors with full request context for debugging

## Impact

### Affected specs
- **MODIFIED**: `mastra-agent-integration` - Endpoint integration requirements only

### Affected code
- `app/(chat)/api/chat/route.ts` - Replace AI SDK with Mastra agent (primary change)
- Remove `dataStream` usage from chat endpoint (Mastra handles tool streaming natively)

### No changes required
- Frontend components or hooks (useChat continues to work)
- Database schema or message format
- Client-side streaming protocol
- Authentication or rate limiting logic
- Mastra tools (already built in Phase 1 with native streaming support)
- Other API endpoints

### Breaking changes
- None: Mastra agent output matches AI SDK format exactly
- Frontend continues using `useChat()` without code changes

### Non-goals
- Frontend integration patterns (covered in separate proposal)
- Other endpoint migrations
- Advanced Mastra memory or agent network features
- Changing database schema

