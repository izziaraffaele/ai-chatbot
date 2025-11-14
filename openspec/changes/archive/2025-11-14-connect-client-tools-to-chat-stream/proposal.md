# Change: Connect Client Tools to Chat Stream Lifecycle

## Why

Client tools (assistant actions) are currently registered dynamically from components via `useAssistantAction()` hook and sent to the Mastra agent, but the chat component does not handle client tool execution when the agent calls them. The Vercel AI SDK's `useChat` hook provides an `onToolCall` callback that receives tool invocations from the stream, but we don't currently process these callbacks. This prevents the complete end-to-end lifecycle of client tool execution:

1. Tools are registered ✓
2. Tools are passed to agent ✓
3. Agent can call tools ✓
4. **Client-side execution is missing ✗**
5. **Result is not sent back to agent ✗**

Without this integration, client tools cannot provide real-time feedback to the user or agent.

## What Changes

- **Rename** `processClientTools()` → `serializeClientTools()` to accurately reflect that it serializes tools for API transmission (not processing)
- **Create** `processClientToolCall()` handler function in `lib/ai/client-tools.ts` to:
  - Match incoming tool call names against registered client tools
  - Execute the correct tool with provided input
  - Capture tool results and errors
  - Return typed results for `useChat`'s `addToolOutput()`
- **Integrate** `processClientToolCall()` into chat component's `onToolCall` callback
- **Update** chat component to use `onToolCall` from Vercel AI SDK to handle client tool execution
- **Update** chat API schema documentation to clarify client tools flow

## Impact

- **Affected specs:** `client-tools` (extends lifecycle requirements)
- **Affected code:**
  - `lib/ai/client-tools.ts` - Rename function, add handler
  - `components/chat.tsx` - Update useChat config to call handler
  - `hooks/use-client-tools.ts` - No changes (returns registry object)
  - `app/(chat)/api/chat/route.ts` - No changes (already passes tools)
  - `app/(chat)/api/chat/schema.ts` - Clarify documentation

- **Breaking changes:** Function rename (`processClientTools` → `serializeClientTools`)
- **Backward compatibility:** Update any other code importing the old function name
