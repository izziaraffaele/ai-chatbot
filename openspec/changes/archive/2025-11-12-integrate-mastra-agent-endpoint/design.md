# Design: Chat Endpoint Migration to Mastra Agent

## Context

The application currently uses Vercel AI SDK's `streamText()` function directly in `/api/chat/route.ts`. Phase 1 created a parallel Mastra agent implementation that replicates all AI SDK capabilities. Phase 2 replaces the endpoint with a direct Mastra implementation using RuntimeContext via `createToolContext` utility for session and chat metadata injection.

**Current Flow:**
```
Client (useChat) → POST /api/chat → AI SDK streamText() → Model API → SSE stream → Client
```

**Target Flow:**
```
Client (useChat) → POST /api/chat → Mastra agent.stream(format: "aisdk") → Model API → SSE stream → Client
```

## Goals / Non-Goals

**Goals:**
- Replace AI SDK `streamText()` with Mastra `agent.stream()` in `/api/chat`
- Maintain 100% backward compatibility with existing frontend (no useChat changes)
- Preserve all real-time tool streaming events via Mastra's native tool streaming
- Inject session and chat context via `createToolContext` from `@mastra/utils/runtime-utils.ts`
- Maintain tokenlens token usage tracking and enrichment
- Ensure error messages surface correctly to client

**Non-Goals:**
- Changing frontend implementation or hooks
- Modifying database schema or message format
- Implementing advanced Mastra features (memory, networks)
- Changing other API endpoints (`/api/document`, `/api/suggestions`)
- Removing AI SDK dependencies globally (may be used elsewhere)

## Decisions

### 1. createToolContext for Session & Chat Injection

**Decision:** Use `createToolContext` utility from `@mastra/utils/runtime-utils.ts` to inject session and chat context into tools

**Rationale:**
- Mastra's `createToolContext` is the recommended pattern for tool-specific context injection
- Tools can access context directly via `context` parameter in execute()
- Session (user ID, permissions) available to tools for authorization
- Chat context (chatId, userId) available for message persistence and logging
- Cleaner than manual RuntimeContext management

**Implementation:**
```typescript
import { createToolContext } from "@mastra/utils/runtime-utils";

const toolContext = createToolContext({
  session,
  chatId,
  userId: session.user.id,
  geolocation,
});

// Tool execute receives toolContext in context param:
execute: async ({ context }) => {
  const { session, chatId } = context;
  // Tool implementation uses context
};
```

**Alternatives considered:**
- Manual RuntimeContext: Rejected in favor of dedicated createToolContext utility
- Closure-based context: Rejected as less explicit

### 2. Stream Format Selection

**Decision:** Use `format: "aisdk"` in `agent.stream()` for automatic client compatibility

**Rationale:**
- Mastra's AI SDK format conversion is built-in
- `.toUIMessageStreamResponse()` handles SSE transformation automatically
- No custom stream transformation layer needed
- Frontend expects AI SDK UIMessageStream format

**Implementation:**
```typescript
const stream = await chatAgent.stream(messages, {
  format: "aisdk",
});

return stream.toUIMessageStreamResponse();
```

**Alternatives considered:**
- `format: "mastra"` with custom transform: Rejected as adds unnecessary complexity
- Manual stream transformation: Rejected as duplicates Mastra's work

### 3. Tool Streaming via Mastra Native Support

**Decision:** Leverage Mastra's native tool streaming (no custom dataStream needed)

**Rationale:**
- Mastra tools support streaming via `writer` parameter in execute()
- Tools can emit custom events natively
- AI SDK format conversion handles tool events automatically
- Cleaner than maintaining separate dataStream

**Implementation:**
```typescript
// In tool execute():
execute: async ({ context, writer }) => {
  await writer?.custom({
    type: "data-kind",
    kind: "text",
  });

  // Tool execution continues
  const result = await createDocument(context);

  return result;
};
```

**Alternatives considered:**
- Passing custom dataStream to tools: Rejected as Mastra handles natively
- Manual dataStream injection: Rejected for same reason

### 4. tokenlens Integration

**Decision:** Extract Mastra response usage and enrich with tokenlens catalog in route handler

**Rationale:**
- Mastra provides `usage` in response metadata
- tokenlens catalog available in route handler context
- Enrichment done after streaming starts
- Usage events written via Mastra's writer.custom()

**Implementation:**
```typescript
const stream = await chatAgent.stream(messages, {
  format: "aisdk",
  onFinish: async ({ usage }) => {
    const catalog = await getTokenlensCatalog();
    const enrichedUsage = getUsage({
      modelId: selectedModel,
      usage,
      providers: catalog
    });
    // Usage written to stream via tool writer
  },
});
```

**Alternatives considered:**
- Pure Mastra observability: Rejected as loses tokenlens features
- Dual tracking: Rejected as wasteful

### 5. Message Persistence Flow

**Decision:** Mastra agent response is streamed to client and saved to database unchanged (same format as AI SDK)

**Rationale:**
- Message schema (`parts`, `attachments`) identical between AI SDK and Mastra
- No conversion needed for database persistence
- Session/chat context passed via toolContext for logging
- Existing message save logic works unchanged

**Implementation:**
- Extract final message text from stream
- Convert to parts format if needed
- Save to `Message_v2` table using existing `lib/db/queries.ts`

**Alternatives considered:**
- Custom message format: Rejected as violates spec
- Converting between formats: Rejected as unnecessary

### 6. Error Handling & Stream Compatibility

**Decision:** Catch Mastra agent errors, log with context, convert to client error messages

**Rationale:**
- Mastra errors need conversion to format client understands
- toolContext provides diagnostic info for logging
- Stream errors should close gracefully
- Tool errors handled by Mastra agent automatically

**Implementation:**
```typescript
try {
  const stream = await chatAgent.stream(messages, {
    format: "aisdk",
    onError: ({ error }) => {
      logger.error("Mastra agent error", {
        chatId,
        userId: session.user.id,
        error: error.message,
      });
    },
  });
  return stream.toUIMessageStreamResponse();
} catch (error) {
  return new Response(JSON.stringify({ error: "Chat failed" }), {
    status: 500
  });
}
```

**Alternatives considered:**
- Fallback to AI SDK on error: Rejected as violates direct replacement goal
- Silent failures: Rejected for poor debugging

## Risks / Trade-offs

### Risk: Stream Format Mismatch
- **Risk:** Mastra's `format: "aisdk"` may not perfectly match current UIMessageStream
- **Mitigation:** Verify stream format against existing tests, test with actual frontend
- **Fallback:** Manual transform layer if needed

### Risk: Tool Context Access
- **Risk:** Tools may not access toolContext correctly
- **Mitigation:** Confirmed via Mastra docs - tools receive context in execute() param ✓

### Risk: Performance Regression
- **Risk:** Mastra streaming may add latency vs AI SDK
- **Mitigation:** Profile streaming performance, compare with baseline
- **Impact:** Expected impact minimal (<50ms), acceptable for chat UX

### Trade-off: No Feature Flag
- **Trade-off:** Direct replacement with no rollback to AI SDK
- **Benefit:** Cleaner codebase, no maintenance burden of dual paths
- **Risk:** If critical issues found, requires quick fix or partial revert

## Migration Plan

### Phase 2 Implementation (This Change)
1. Add `createToolContext` injection to route handler
2. Replace AI SDK `streamText()` with Mastra `agent.stream(format: "aisdk")`
3. Integrate tokenlens usage tracking in stream
4. Implement error handling
5. Test endpoint with existing frontend
6. Verify message persistence to database
7. Validate all tool functionality (weather, document creation, suggestions)

### Rollback Plan (if needed)
- Keep AI SDK code in git history
- Revert commit to restore AI SDK implementation
- No data migration needed (same message format)
- No schema changes to revert

## Confirmed Answers

1. **Stream Format Verification:** Does `format: "aisdk"` + `.toUIMessageStreamResponse()` produce exact same format as current AI SDK stream?
   - ✅ **Yes** - Confirmed compatible

2. **Tool Context Access:** Can tools access RuntimeContext values directly via `runtimeContext.get()` in execute()?
   - ✅ **Yes** - Confirmed available in tool execute context param

