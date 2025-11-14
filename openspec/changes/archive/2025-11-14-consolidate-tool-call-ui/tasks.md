# Implementation Tasks: Consolidate Tool Call UI

## Overview

This document tracks the implementation of the component-based tool UI architecture. Tasks are sequenced to deliver working functionality incrementally.

---

## 1. Setup & Types

### 1.1 Create tools directory structure
- [x] Create `components/tools/` directory
- [x] Create `components/tools/index.ts` for exports
- [x] Verify directory is in correct location alongside other component dirs

### 1.2 Define tool component types
- [x] Create `components/tools/types.ts` with:
  - Generic `ToolUIComponentProps<T>` type with `part: ToolUIPart<T>` and `isReadonly?: boolean`
  - Union type `ToolPart` covering all tool types (getWeather, createDocument, etc.)
  - Common props interface including `isReadonly` and optional `className`
  - Document that `isReadonly` affects rendering and MUST be in memoization checks
- [x] Validate types compile without errors

---

## 2. Implement Individual Tool Components

### 2.1 WeatherToolUI Component
- [x] Create `components/tools/weather-tool.tsx`
- [x] Implement component with:
  - Props: `{ part: ToolUIPart<GetWeatherTool>; isReadonly?: boolean }`
  - Memoization using `React.memo()` with custom equality check
  - Equality check: `equal(prevProps.part, nextProps.part) && prevProps.isReadonly === nextProps.isReadonly`
  - Collapsible Tool container (reuse existing `Tool` component)
  - ToolHeader with state badge
  - ToolInput showing parameters (JSON)
  - ToolOutput with custom `<Weather />` component
  - Disable collapsible trigger when `isReadonly === true`
- [x] Export as default
- [x] Verify formatting passes `pnpm lint`

### 2.2 CreateDocumentToolUI Component
- [x] Create `components/tools/create-document-tool.tsx`
- [x] Implement component with:
  - Props: `{ part: ToolUIPart<CreateDocumentTool>; isReadonly?: boolean }`
  - Memoization with equality check on both `part` and `isReadonly`
  - ToolHeader showing state
  - ToolInput showing document parameters (title, kind, description)
  - ToolOutput with `<DocumentPreview />` component
  - Error state handling (show error if `part.output.error` exists)
  - Disable interactive elements when `isReadonly === true`
- [x] Export as default
- [x] Verify formatting

### 2.3 UpdateDocumentToolUI Component
- [x] Create `components/tools/update-document-tool.tsx`
- [x] Implement component with:
  - Props: `{ part: ToolUIPart<UpdateDocumentTool>; isReadonly?: boolean }`
  - Memoization with equality check on both `part` and `isReadonly`
  - Similar structure to CreateDocumentToolUI
  - ToolInput showing update parameters
  - ToolOutput with `<DocumentPreview args={{ ...part.output, isUpdate: true }} />`
  - Error state handling
  - Disable interactive elements when `isReadonly === true`
- [x] Export as default
- [x] Verify formatting

### 2.4 RequestSuggestionsToolUI Component
- [x] Create `components/tools/request-suggestions-tool.tsx`
- [x] Implement component with:
  - Props: `{ part: ToolUIPart<RequestSuggestionsTool>; isReadonly?: boolean }`
  - Memoization with equality check on both `part` and `isReadonly`
  - ToolHeader with state badge
  - ToolInput showing document ID and suggestion request params
  - ToolOutput with `<DocumentToolResult type="request-suggestions" />`
  - Error handling for suggestions errors
  - Disable interactive elements when `isReadonly === true`
- [x] Export as default
- [x] Verify formatting

---

## 3. Create Tool Router (Optional)

### 3.1 Create ToolUIRouter component
- [x] Create `components/tool-ui-router.tsx` with switch statement
- [x] Route each `part.type` to corresponding component
- [x] Add TypeScript exhaustiveness check for all tool types
- [x] Export as default
- [x] Verify no unhandled tool types

---

## 4. Update PreviewMessage Component

### 4.1 Import tool components
- [x] Add imports for all 4 tool UI components to `components/message.tsx`
- [x] Remove old inline tool UI imports (Tool, ToolHeader, ToolInput, ToolOutput rendered inline)

### 4.2 Replace tool rendering logic
- [x] Replace large switch statement (lines 163-263 approx) with new tool routing
- [x] Use either direct switch or `<ToolUIRouter />` component, passing `isReadonly` prop
- [x] Router/switch should pass `isReadonly={isReadonly}` to all tool components
- [x] Update key generation to use `part.toolCallId`
- [x] Verify all tool types are still rendered with correct interactivity state

### 4.3 Clean up PreviewMessage
- [x] Remove now-unused inline tool component props
- [x] Remove unused imports
- [x] Verify component structure still makes sense
- [x] Run `pnpm lint` and `pnpm format`

---

## 5. Testing & Validation

### 5.1 Local testing
- [x] Start dev server: `pnpm dev`
- [x] Trigger weather tool call and verify rendering
- [x] Trigger createDocument tool call and verify rendering
- [x] Trigger updateDocument tool call and verify rendering
- [x] Trigger requestSuggestions tool call and verify rendering
- [x] Test each tool state: input-streaming, input-available, output-available, output-error
- [x] Verify memoization prevents re-renders (React DevTools Profiler)

### 5.2 E2E test validation
- [x] Run `pnpm test` to execute Playwright tests
- [x] Verify all existing message tests pass
- [x] Verify tool rendering tests pass (if any)
- [x] No new test failures introduced

### 5.3 Code quality checks
- [x] Run `pnpm lint` - zero errors/warnings
- [x] Run `pnpm format` - all files properly formatted
- [x] Check TypeScript strict mode - no `any` types, no unused variables

---

## 6. Documentation & Handoff

### 6.1 Update code comments
- [x] Add JSDoc comments to each tool component explaining purpose
- [x] Document the `part` prop structure for new tool authors
- [x] Add example of how to create a new tool component

### 6.2 Create pattern documentation (optional)
- [x] Create `components/tools/README.md` with:
  - Overview of component-based tool UI pattern
  - Step-by-step guide to adding a new tool component
  - Expected component structure and props
  - Example code snippet

### 6.3 Verify types are exported
- [x] Update `components/tools/index.ts` to export all tool components
- [x] Ensure types are available for external use if needed

---

## Notes

- **Dependencies:** All tool components depend on existing UI primitives (`Tool`, `ToolHeader`, `ToolInput`, `ToolOutput` in `components/elements/tool.tsx`)
- **Testing strategy:** E2E tests should cover the full tool rendering flow; unit tests for memoization are nice-to-have
- **Performance:** Monitor React DevTools Profiler to confirm memoization effectiveness
- **Extensibility:** New tools simply require creating a new component file and adding a case to the switch statement
