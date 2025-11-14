# Change: Consolidate Tool Call UI into Component-Based Architecture

## Why

Currently, tool call UI rendering is centralized in `components/message.tsx` with a large switch statement routing different tool types (getWeather, createDocument, updateDocument, requestSuggestions) to inline JSX. This approach creates several problems:

1. **Maintainability:** Adding new tools or modifying existing UI requires editing a large, complex component
2. **Code organization:** Tool-specific UI logic is scattered across a single file rather than colocated with tool concerns
3. **Testability:** Each tool UI state (input, output, error) is harder to test in isolation
4. **Reusability:** Custom renders (Weather, DocumentPreview, DocumentToolResult) can't easily be reused or composed
5. **Performance:** No fine-grained memoization per tool component, risking unnecessary re-renders

## What Changes

- **Create dedicated tool UI components** - One component per tool type (`WeatherToolUI`, `CreateDocumentToolUI`, etc.) in a new `components/tools/` directory
- **Implement memoization** - Each tool component memoized with deep equality check on the `part` prop
- **Type-safe part passing** - Tool components receive `part: ToolUIPart<ToolType>` with proper TypeScript types
- **Centralized lifecycle** - Each tool component manages its own state (expanded/collapsed, loading, error)
- **Simple router** - `PreviewMessage` uses a clean switch/map to route `part.type` to the correct tool component
- **Preserve existing behavior** - No breaking changes to message flow, API, or external behavior

## Impact

- **Affected specs:** New `tool-ui` capability spec (tool UI rendering and lifecycle)
- **Affected code:**
  - `components/message.tsx` - Simplify to use tool component router
  - Create `components/tools/` directory with 4 initial components
  - Create `components/tools/tool-ui-router.tsx` (optional, for centralized routing)
- **No breaking changes** - Refactor is internal to UI layer
- **Testing:** E2E tests should pass without modification; add unit tests for tool components as nice-to-have
