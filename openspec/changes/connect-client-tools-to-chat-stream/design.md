# Design Document: Client Tool Lifecycle Integration

## Context

The client tools system enables browser-based tool execution for AI agents. Currently:

1. **Registration Phase** ✓ Complete
   - Components register actions via `useAssistantAction()` hook
   - Registry stores tools with execute handlers
   - `serializeClientTools()` converts tools to JSON schema

2. **Transmission Phase** ✓ Complete
   - Chat component fetches tools from registry
   - Tools are serialized and sent to chat API in request body
   - Mastra agent receives tool definitions

3. **Invocation Phase** ✓ Partially complete
   - Mastra agent can call client tools in its response
   - Agent tool calls are streamed to the browser via Vercel AI SDK

4. **Execution Phase** ✗ Missing
   - `useChat` hook receives tool invocations via `onToolCall` callback
   - No handler currently processes these callbacks
   - Client tool execute functions are never called
   - Results are not sent back to the agent

## Goals

- Complete the client tool lifecycle by implementing the execution phase
- Provide a clear, reusable handler for client tool invocations: `processClientToolCall()`
- Integrate seamlessly with Vercel AI SDK's `useChat` hook
- Maintain type safety and error handling throughout
- Use clear naming to distinguish serialization (server communication) from execution (browser operations)

## Non-Goals

- Modify the Mastra agent architecture
- Change how tools are registered or stored
- Alter the tool schema validation system
- Support server-side tool execution in this phase

## Decisions

### Decision 1: Function Naming - `serializeClientTools()` vs `processClientTools()`

**What:** Rename `processClientTools()` to `serializeClientTools()`

**Why:**
- `processClientTools` implies execution/computation, but the function only converts tool definitions to JSON schema
- `serializeClientTools` accurately describes converting objects to transmittable format
- Creates semantic clarity in the codebase:
  - `serializeClientTools()` = prepare tools for API transmission
  - `processClientToolCall()` = execute tool invocation from stream
- Reduces cognitive load when reading code ("serialize for API" is immediately clear)

**Alternatives considered:**
- Keep `processClientTools` and rename new handler differently (e.g., `executeClientTool`) - but creates similar naming confusion
- Use `convertClientTools` - less clear about the direction/purpose of transformation

### Decision 2: Create Dedicated Handler - `processClientToolCall()`

**What:** New function `processClientToolCall(toolCall)` in `lib/ai/client-tools.ts`

**Why:**
- Centralizes client tool execution logic in a reusable location
- Separates concerns: chat component manages UI flow, handler manages tool execution
- Follows Single Responsibility Principle
- Enables testing of tool execution independently from chat component
- Can be imported and reused in other components if needed

**Signature:**
```typescript
export async function processClientToolCall(
  toolCall: ToolCall
): Promise<{
  toolCallId: string;
  tool: string;
  output: unknown;
}>;
```

**Type definition for ToolCall:**
```typescript
interface ToolCall {
  toolName: string;
  toolCallId: string;
  input: unknown;
  dynamic?: boolean;
}
```

### Decision 3: Place Handler in lib/ai/client-tools.ts

**Why:**
- Colocates with `serializeClientTools()` for easy discovery
- `lib/ai/` is the standard location for AI tool-related code
- Follows project convention: AI-related utilities belong in `lib/ai/`
- Clear separation from UI components (chat component stays in `components/`)
- Reusable across different components if needed

**Alternative considered:**
- Place in chat component directly - less testable, harder to reuse

### Decision 4: Error Handling Strategy

**What:** Catch tool execution errors and return them as tool results (not throw)

**Why:**
- Follows Vercel AI SDK patterns (tools return results, not throw)
- Allows agent to see what went wrong and handle gracefully
- Prevents unhandled exceptions from breaking the stream
- Agent can decide how to communicate error to user

**Implementation:**
```typescript
try {
  const result = await tool.execute(input);
  return { toolCallId, tool: toolName, output: result };
} catch (error) {
  return {
    toolCallId,
    tool: toolName,
    output: { error: error.message }, // Agent sees structured error
  };
}
```

### Decision 5: Dynamic Tool Handling

**What:** Check `toolCall.dynamic` first and return early

**Why:**
- Per Vercel AI SDK documentation: must check before accessing typed tool name
- Prevents TypeScript errors when narrowing tool call types
- Allows SDK to handle dynamic tools via its own mechanisms
- Clean separation: we only handle registered static tools

**Implementation:**
```typescript
if (toolCall.dynamic) {
  return; // Let SDK handle this
}
```

## Architecture Flow

### Current (Incomplete)
```
Component mounts
  ↓
useAssistantAction() registers tool
  ↓
Chat component retrieves registry
  ↓
serializeClientTools() → JSON schema
  ↓
Request sent to /api/chat with tools
  ↓
Mastra agent receives tools, can call them
  ↓
Tool call streamed to browser
  ↓
useChat hook receives tool in onToolCall
  ↓
[DEAD END - no handler exists]
```

### Expected (Complete)
```
Component mounts
  ↓
useAssistantAction() registers tool
  ↓
Chat component retrieves registry
  ↓
serializeClientTools() → JSON schema
  ↓
Request sent to /api/chat with tools
  ↓
Mastra agent receives tools, can call them
  ↓
Tool call streamed to browser
  ↓
useChat hook receives tool in onToolCall
  ↓
processClientToolCall() executes tool
  ↓
Tool execute handler runs in browser
  ↓
addToolOutput() sends result to stream
  ↓
Agent continues with tool result
  ↓
✓ Complete lifecycle
```

## Technical Integration Points

### 1. lib/ai/client-tools.ts
- Rename: `processClientTools` → `serializeClientTools`
- Add: `processClientToolCall(toolCall)` function
- Exports both functions for use elsewhere

### 2. components/chat.tsx
- Import `processClientToolCall` from `lib/ai/client-tools`
- Add `onToolCall` callback to `useChat()` config
- Handler calls `processClientToolCall()` and passes result to `addToolOutput()`

### 3. No changes needed
- `hooks/use-client-tools.ts` - still returns registry object
- `app/(chat)/api/chat/route.ts` - still passes tools to agent
- `app/(chat)/api/chat/schema.ts` - schema still accepts tools

## Risk Analysis

### Risk: Tool Not Found in Registry
- **Impact:** High - tool execution fails silently
- **Mitigation:** Check registry before executing, return error result to agent
- **Testing:** Test with unregistered tool name

### Risk: Tool Execute Function Throws
- **Impact:** Medium - could break stream
- **Mitigation:** Try/catch in handler, return error as result
- **Testing:** Test with execute function that throws

### Risk: Deadlocks with await
- **Impact:** High - per Vercel AI SDK docs, using await with `addToolOutput()` can deadlock
- **Mitigation:** Call `addToolOutput()` without await (fire and forget)
- **Code:** `addToolOutput(...); // no await`

### Risk: TypeScript Narrowing with dynamic Tools
- **Impact:** Medium - type errors if dynamic check is wrong
- **Mitigation:** Always check `toolCall.dynamic` before accessing typed fields
- **Testing:** Unit test with dynamic=true

## Testing Strategy

### Unit Tests
- Test `serializeClientTools()` still works (rename should be mechanical)
- Test `processClientToolCall()` with registered tool
- Test `processClientToolCall()` with unregistered tool
- Test `processClientToolCall()` with tool that throws
- Test `processClientToolCall()` with dynamic tool

### Integration Tests
- Test chat component with multiple client tools registered
- Test tool call during streaming conversation
- Test error propagation from tool to agent

### Manual Tests
- Register a simple client tool from a component
- Send message that triggers tool call
- Verify tool executes and result is visible to agent

## Migration Plan

### For Existing Code Using processClientTools()
- Search codebase for `processClientTools` imports
- Replace with `serializeClientTools`
- Verify functionality unchanged (it's just a rename)

### For Components Using Client Tools
- No changes required - `useAssistantAction()` hook still works the same
- Tool execution now "just works" when agent calls them

## Open Questions

1. Should `processClientToolCall()` be async or sync?
   - **Decision:** async - tool.execute() can be async, better to await
   - **Impact:** `onToolCall` callback can be async, Vercel AI SDK supports this

2. Should we provide a hook like `useClientToolCall()` for testing?
   - **Decision:** No - not needed initially, keep it simple
   - **Future:** Can add if multiple components need to process tools

3. Should tool results be logged/monitored?
   - **Decision:** Log errors via console.error, leave result logging to agent
   - **Future:** Can enhance with observability if needed

## Rollback Plan

If issues arise:
1. Revert the commit
2. Keep `processClientTools()` function name (undo rename)
3. Remove `processClientToolCall()` function
4. Remove `onToolCall` from chat component's `useChat()`
5. Client tools won't execute, but won't crash

No data migration needed - everything is in-memory registry.
