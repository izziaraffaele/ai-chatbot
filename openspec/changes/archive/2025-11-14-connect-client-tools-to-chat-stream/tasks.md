# Implementation Tasks

## 1. Update lib/ai/client-tools.ts

### 1.1 Rename Function
- [x] Rename `processClientTools()` to `serializeClientTools()`
- [x] Update JSDoc to clarify it serializes tools for API transmission
- [x] Keep the same functionality and return type

### 1.2 Create processClientToolCall Handler
- [x] Add new function `processClientToolCall(toolCall)` to `lib/ai/client-tools.ts`
- [x] Implement early return for `toolCall.dynamic` tools
- [x] Implement tool lookup from registry by `toolName`
- [x] Implement tool execution with provided input
- [x] Handle execution errors gracefully (try/catch, return as tool result)
- [x] Return object with shape: `{ toolCallId, tool, output }` for `addToolOutput()`
- [x] Add TypeScript types for the function signature and return type
- [x] Add JSDoc with examples and error handling notes

## 2. Update components/chat.tsx

### 2.1 Update useChat Configuration
- [x] Import `processClientToolCall` from `lib/ai/client-tools`
- [x] Add `onToolCall` callback to `useChat` hook configuration
- [x] Implement callback to call `processClientToolCall(toolCall)`
- [x] Call `addToolOutput()` with the handler's return value (no await to avoid deadlocks)
- [x] Test that tool calls from agent are properly routed

### 2.2 Update prepareSendMessagesRequest Call
- [x] Change `processClientTools()` to `serializeClientTools()` in the tools parameter

## 3. Update Other References

### 3.1 Update Any Imports
- [x] Search for any other imports of `processClientTools` in the codebase
- [x] Update them to use `serializeClientTools`
- [x] Check tests and configuration files

### 3.2 Update Type Definitions (if needed)
- [x] Review `lib/types.ts` for any type definitions related to tool processing
- [x] Update types if necessary to reflect new function names and signatures

## 4. Validation & Testing

### 4.1 Code Quality
- [x] Run `pnpm lint` and fix any linting issues
- [x] Run `pnpm format` to ensure code style compliance
- [x] Verify TypeScript strict mode passes with `pnpm build`

### 4.2 Manual Testing
- [x] Start dev server with `pnpm dev`
- [x] Create a chat message that triggers a client tool call
- [x] Verify tool is executed in the browser
- [x] Verify result is sent back to agent
- [x] Check console for any errors or warnings

### 4.3 Integration Testing
- [x] Test with multiple client tools registered
- [x] Test error handling when tool execution fails
- [x] Test with dynamic tools (should be skipped)
- [x] Test component mount/unmount with `useAssistantAction()`

## 5. OpenSpec Tasks

### 5.1 Validate Changes
- [x] Run `openspec validate connect-client-tools-to-chat-stream --strict`
- [x] Resolve any validation errors

### 5.2 Archive Change (after deployment)
- [x] Create separate commit/PR to archive change
- [x] Run `openspec archive connect-client-tools-to-chat-stream --yes`
- [x] Update `openspec/specs/client-tools/spec.md` with archived requirements
