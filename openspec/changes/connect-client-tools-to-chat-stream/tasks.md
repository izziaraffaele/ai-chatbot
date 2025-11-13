# Implementation Tasks

## 1. Update lib/ai/client-tools.ts

### 1.1 Rename Function
- [ ] Rename `processClientTools()` to `serializeClientTools()`
- [ ] Update JSDoc to clarify it serializes tools for API transmission
- [ ] Keep the same functionality and return type

### 1.2 Create processClientToolCall Handler
- [ ] Add new function `processClientToolCall(toolCall)` to `lib/ai/client-tools.ts`
- [ ] Implement early return for `toolCall.dynamic` tools
- [ ] Implement tool lookup from registry by `toolName`
- [ ] Implement tool execution with provided input
- [ ] Handle execution errors gracefully (try/catch, return as tool result)
- [ ] Return object with shape: `{ toolCallId, tool, output }` for `addToolOutput()`
- [ ] Add TypeScript types for the function signature and return type
- [ ] Add JSDoc with examples and error handling notes

## 2. Update components/chat.tsx

### 2.1 Update useChat Configuration
- [ ] Import `processClientToolCall` from `lib/ai/client-tools`
- [ ] Add `onToolCall` callback to `useChat` hook configuration
- [ ] Implement callback to call `processClientToolCall(toolCall)`
- [ ] Call `addToolOutput()` with the handler's return value (no await to avoid deadlocks)
- [ ] Test that tool calls from agent are properly routed

### 2.2 Update prepareSendMessagesRequest Call
- [ ] Change `processClientTools()` to `serializeClientTools()` in the tools parameter

## 3. Update Other References

### 3.1 Update Any Imports
- [ ] Search for any other imports of `processClientTools` in the codebase
- [ ] Update them to use `serializeClientTools`
- [ ] Check tests and configuration files

### 3.2 Update Type Definitions (if needed)
- [ ] Review `lib/types.ts` for any type definitions related to tool processing
- [ ] Update types if necessary to reflect new function names and signatures

## 4. Validation & Testing

### 4.1 Code Quality
- [ ] Run `pnpm lint` and fix any linting issues
- [ ] Run `pnpm format` to ensure code style compliance
- [ ] Verify TypeScript strict mode passes with `pnpm build`

### 4.2 Manual Testing
- [ ] Start dev server with `pnpm dev`
- [ ] Create a chat message that triggers a client tool call
- [ ] Verify tool is executed in the browser
- [ ] Verify result is sent back to agent
- [ ] Check console for any errors or warnings

### 4.3 Integration Testing
- [ ] Test with multiple client tools registered
- [ ] Test error handling when tool execution fails
- [ ] Test with dynamic tools (should be skipped)
- [ ] Test component mount/unmount with `useAssistantAction()`

## 5. OpenSpec Tasks

### 5.1 Validate Changes
- [ ] Run `openspec validate connect-client-tools-to-chat-stream --strict`
- [ ] Resolve any validation errors

### 5.2 Archive Change (after deployment)
- [ ] Create separate commit/PR to archive change
- [ ] Run `openspec archive connect-client-tools-to-chat-stream --yes`
- [ ] Update `openspec/specs/client-tools/spec.md` with archived requirements
