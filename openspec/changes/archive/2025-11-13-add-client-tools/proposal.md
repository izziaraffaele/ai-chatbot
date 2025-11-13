# Change: Add Client-Side Tool Support with Mastra

## Why

The AI chatbot currently supports server-side tools only (getWeather, createDocument, etc.). Client-side tools enable agents to execute browser-side functionality such as DOM manipulation, local storage access, and other Web APIs. This expands agent capabilities while keeping computation and state changes in the user's environment, improving security and reducing server load for client-specific operations.

## What Changes

- Create a client tool registry system for registering browser-side tools
- Add a client tools provider and custom hook (`useClientTools`) for React components
- Integrate client tools into the existing Mastra agent workflow
- Provide an example client tool implementation
- Update `useChat` hook to support client tool execution

## Impact

- **Affected specs:** Add new `client-tools` capability spec
- **Affected code:**
  - `lib/ai/client-tools.ts` (new client tool registry and utilities)
  - `lib/hooks/use-client-tools.ts` (new hook)
  - `components/chat.tsx` (integrate client tools in chat component)
- **No breaking changes** - Client tools are optional and backward compatible