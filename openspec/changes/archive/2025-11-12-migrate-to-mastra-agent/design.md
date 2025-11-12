# Design: Mastra Chat Agent Integration

## Context

The application currently uses Vercel AI SDK's `streamText` function directly in the `/api/chat` route handler. This change introduces a parallel Mastra agent implementation to prepare for future migration.

**Current Architecture:**
- Direct `streamText` calls with inline tool definitions
- Tools receive session and dataStream context via closures
- Model selection handled via provider abstraction
- tokenlens integration in `onFinish` callback
- Smooth streaming and resumable streams (optional with Redis)

**Target Architecture:**
- Mastra Agent with registered tools
- Tools as Mastra tool definitions with context injection
- Agent-managed conversation memory
- Built-in Mastra observability alongside tokenlens
- Streaming through Mastra's agent API

## Goals / Non-Goals

**Goals:**
- Create feature-parity Mastra agent that matches all AI SDK capabilities
- Maintain backward compatibility with existing UI and data structures
- Enable parallel testing of Mastra implementation
- Preserve session context and dataStream functionality for tools
- Keep tokenlens usage tracking

**Non-Goals:**
- Replacing the existing `/api/chat` endpoint (done in future change)
- Modifying client-side streaming protocol
- Changing database schema or message format
- Migrating from AI SDK provider abstraction
- Removing AI SDK dependencies

## Decisions

### 1. Tool Context Injection Pattern

**Decision:** Use factory functions to inject session and dataStream into Mastra tools

**Rationale:**
- Current AI SDK tools use closures to capture session and dataStream
- Mastra tools are registered statically with the agent
- Factory pattern allows creating tool instances with context at runtime
- Maintains compatibility with existing tool signatures

**Implementation:**
```typescript
// Factory function pattern
export const createMastraTools = (
  session: Session,
  dataStream: DataStreamWriter
) => ({
  getWeather: createGetWeatherTool(),
  createDocument: createCreateDocumentTool({ session, dataStream }),
  updateDocument: createUpdateDocumentTool({ session, dataStream }),
  requestSuggestions: createRequestSuggestionsTool({ session, dataStream }),
});
```

**Alternatives considered:**
- Global state for context: Rejected due to concurrency issues
- Thread-local storage: Rejected due to complexity and potential memory leaks
- Context parameter in tool execute: Rejected as Mastra doesn't support custom context

### 2. Model Selection Strategy

**Decision:** Create two separate agent configurations (chat and reasoning) or use agent configuration override

**Rationale:**
- Reasoning model requires tool calling to be disabled
- Regular model requires all 4 tools enabled
- Agent configuration can be overridden at generation time
- Cleaner separation of concerns

**Implementation:**
```typescript
// Option A: Two agents
export const chatAgent = new Agent({
  name: 'Chat Agent',
  tools: { getWeather, createDocument, updateDocument, requestSuggestions },
  // ...
});

export const reasoningAgent = new Agent({
  name: 'Reasoning Agent',
  tools: {}, // No tools
  // ...
});

// Option B: Runtime configuration (preferred)
const tools = selectedChatModel === 'chat-model-reasoning'
  ? {}
  : createMastraTools(session, dataStream);

await chatAgent.generate({
  tools, // Override tools at runtime
  // ...
});
```

**Chosen:** Option B (runtime configuration) for simpler maintenance

**Alternatives considered:**
- Single agent with conditional tool filtering: Rejected as tools are registered at agent creation
- Three separate agents (chat, reasoning, artifacts): Rejected as over-engineered for current needs

### 3. Streaming Integration

**Decision:** Use Mastra's built-in streaming with custom transform for dataStream events

**Rationale:**
- Mastra agents support streaming responses
- Need to maintain compatibility with current UI (expects AI SDK stream format)
- dataStream events (data-kind, data-id, data-title, etc.) must continue working
- Can wrap Mastra stream with custom transform layer

**Implementation:**
```typescript
const mastraStream = await chatAgent.generate({
  stream: true,
  // ...
});

// Transform Mastra stream to AI SDK-compatible format
const transformedStream = transformMastraStream(mastraStream, dataStream);

return new Response(transformedStream.pipeThrough(new JsonToSseTransformStream()));
```

**Alternatives considered:**
- Rewrite client to use Mastra stream format: Rejected as violates non-goal
- Disable streaming temporarily: Rejected as degrades UX
- Dual stream implementation: Rejected as too complex

### 4. tokenlens Integration

**Decision:** Extract usage from Mastra response metadata and enrich with tokenlens

**Rationale:**
- Mastra provides usage information in response metadata
- tokenlens enrichment logic can be reused
- Maintains consistency with current usage tracking
- Allows gradual migration to Mastra's built-in observability

**Implementation:**
```typescript
const response = await chatAgent.generate({ /* ... */ });

// Extract usage from Mastra
const usage = response.usage;

// Enrich with tokenlens
const catalog = await getTokenlensCatalog();
const enrichedUsage = getUsage({ modelId, usage, providers: catalog });

// Write to dataStream for UI
dataStream.write({ type: "data-usage", data: enrichedUsage });
```

**Alternatives considered:**
- Use only Mastra observability: Rejected as loses tokenlens-specific features
- Duplicate tracking: Rejected as wasteful and potentially inconsistent

### 5. Memory Management

**Decision:** Use Mastra's built-in Memory with LibSQL storage, but don't auto-load history

**Rationale:**
- Mastra's Memory feature provides conversation context management
- Application already manages message history via PostgreSQL
- Loading messages from DB maintains single source of truth
- Memory used for within-session context, not long-term storage

**Implementation:**
```typescript
export const chatAgent = new Agent({
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
  // ...
});

// In route handler: manually construct message history
const messagesFromDb = await getMessagesByChatId({ id });
const uiMessages = convertToUIMessages(messagesFromDb);

await chatAgent.generate({
  messages: uiMessages, // Pass full history explicitly
  // ...
});
```

**Alternatives considered:**
- Migrate message storage to Mastra Memory: Rejected as major breaking change
- Disable Mastra Memory: Rejected as loses within-session context benefits
- Dual storage: Rejected as creates inconsistency

## Risks / Trade-offs

### Risk: Stream Format Incompatibility
- **Risk:** Mastra's stream format may not match AI SDK's UIMessageStream format
- **Mitigation:** Create transform layer to convert Mastra streams to AI SDK format
- **Fallback:** If incompatible, defer migration until client updated

### Risk: Tool Execution Context
- **Risk:** Factory pattern may not work if Mastra validates tools at agent creation
- **Mitigation:** Test tool registration with factory functions early
- **Fallback:** Use middleware pattern to inject context before agent generation

### Risk: Performance Overhead
- **Risk:** Additional transformation layers may add latency
- **Mitigation:** Profile streaming performance, optimize hot paths
- **Impact:** Expected < 50ms overhead, acceptable for chat UX

### Trade-off: Dual Observability Systems
- **Trade-off:** Running both tokenlens and Mastra observability adds complexity
- **Benefit:** Allows gradual migration and comparison of metrics
- **Future:** Consolidate to Mastra observability after migration complete

### Trade-off: Parallel Implementations
- **Trade-off:** Maintaining both AI SDK and Mastra code paths increases maintenance
- **Benefit:** De-risks migration with ability to roll back
- **Timeline:** Remove AI SDK implementation after 2-4 weeks of stable Mastra usage

## Migration Plan

### Phase 1: Agent Creation (This Change)
1. Create Mastra chat agent with all tools
2. Add factory functions for tool context injection
3. Implement stream transformation layer
4. Test agent in isolation (no endpoint integration)

### Phase 2: Endpoint Integration (Future Change)
1. Add feature flag for Mastra vs AI SDK
2. Create parallel code path in `/api/chat`
3. Deploy with flag disabled
4. Enable for internal testing
5. Gradual rollout to users

### Phase 3: Cleanup (Future Change)
1. Remove AI SDK code path
2. Consolidate to single observability system
3. Remove feature flag
4. Update documentation

**Rollback Plan:**
- Disable feature flag returns to AI SDK path
- No data migration required
- Zero downtime rollback

## Open Questions

1. **Mastra Stream Format:** Does Mastra's agent streaming API return a format compatible with `JsonToSseTransformStream`?
   - **Resolution:** Test during implementation, create adapter if needed

2. **Tool Validation Timing:** Does Mastra validate tool schemas at agent creation or at generation time?
   - **Resolution:** Read Mastra docs and test with simple agent

3. **Memory Scope:** Should Mastra Memory be per-chat or per-user?
   - **Resolution:** Start with per-chat (matches current model), evaluate after testing

4. **Error Handling:** How do Mastra tool errors surface in the stream?
   - **Resolution:** Test error scenarios, map to existing error handling

5. **Reasoning Model:** Does Mastra have built-in support for reasoning/thinking tokens?
   - **Resolution:** Check Mastra docs, may need custom parsing similar to current `<think>` tag extraction
