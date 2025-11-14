# Tool UI Components

This directory contains React components for rendering tool call results in messages. Each tool type has a dedicated, memoized component for maintainability and performance.

## Overview

The tool UI system is responsible for:
- Rendering tool invocations (input parameters and results)
- Managing visual state (expanded/collapsed, loading, errors)
- Respecting read-only mode for archived messages
- Type-safe access to tool input/output data

## File Structure

```
components/tools/
├── types.ts                      # Shared types and props interfaces
├── weather-tool.tsx              # Weather tool UI component
├── create-document-tool.tsx       # Document creation tool UI
├── update-document-tool.tsx       # Document update tool UI
├── request-suggestions-tool.tsx   # Suggestion request tool UI
├── index.ts                       # Central export point
└── README.md                      # This file
```

## Adding a New Tool Component

To add support for a new tool type, follow these steps:

### 1. Define the Component

Create a new file: `components/tools/[tool-name]-tool.tsx`

```typescript
"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import type { InferToolUIComponentProps } from "./types";

export type MyToolUIProps = InferToolUIComponentProps<"tool-myTool">;

/**
 * MyToolUI Component
 * Displays my tool invocations with relevant UI
 * Memoized to prevent re-renders when part or isReadonly props haven't changed
 */
function PureMyToolUI({ part, isReadonly = false }: MyToolUIProps) {
  // Render based on part.state
  // part.state can be: 'input-streaming', 'input-available', 'output-available', 'output-error'

  return (
    <div>
      {/* Render your tool UI here */}
    </div>
  );
}

export const MyToolUI = memo(PureMyToolUI, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

MyToolUI.displayName = "MyToolUI";
```

### 2. Update the Router

Add a case to `components/tool-ui-router.tsx`:

```typescript
case 'tool-myTool':
  return (
    <MyToolUI
      isReadonly={isReadonly}
      key={part.toolCallId}
      part={part}
    />
  );
```

### 3. Export from Index

Update `components/tools/index.ts`:

```typescript
export { MyToolUI } from './my-tool';
```

### 4. TypeScript Enforcement

The router uses a TypeScript `never` exhaustiveness check. If you forget to add your tool case, the code won't compile—this prevents silent failures.

## Component Props

All tool UI components receive:

```typescript
type ToolUIComponentProps = {
  /** The tool part containing input, output, and state information */
  part: ChatAgentToolUIPart;

  /** Whether the message/tool is in read-only mode.
      Disables interactive elements when true. */
  isReadonly?: boolean;

  /** Optional CSS class name for custom styling */
  className?: string;
};
```

### `part` Structure

The `part` object contains:
- **`part.type`** - Tool identifier (e.g., `'tool-getWeather'`)
- **`part.toolCallId`** - Unique call ID for keying
- **`part.state`** - Current state: `'input-streaming'` | `'input-available'` | `'output-available'` | `'output-error'`
- **`part.input`** - Tool invocation parameters (object matching tool schema)
- **`part.output`** - Tool result (type depends on tool)

### `isReadonly` Behavior

When `isReadonly === true`:
- Disable buttons and interactive elements
- Still render read-only display of results
- Used for archived messages or non-editable contexts
- **Must be included in memoization equality check** (if it changes, component re-renders)

## Memoization Pattern

All tool components use `React.memo()` with a custom equality function:

```typescript
export const MyToolUI = memo(PureMyToolUI, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
```

This prevents re-renders when `part` and `isReadonly` haven't changed, improving performance in chat-heavy workflows.

## Common State Transitions

### Loading State
```typescript
if (part.state === 'input-streaming') {
  return <LoadingBadge />;
}
```

### Showing Input
```typescript
if (part.state === 'input-available') {
  return <ToolInput input={part.input} />;
}
```

### Showing Output
```typescript
if (part.state === 'output-available') {
  return <ToolOutput output={part.output} />;
}
```

### Error Handling
```typescript
if (part.output && 'error' in part.output) {
  return <ErrorDisplay error={part.output.error} />;
}
```

## Reusable UI Primitives

The codebase provides tool-agnostic UI components in `components/elements/tool.tsx`:

- **`<Tool>`** - Container with collapsible behavior
- **`<ToolHeader>`** - Title and state badge
- **`<ToolInput>`** - Formatted display of input parameters
- **`<ToolOutput>`** - Container for output rendering
- **`<ToolContent>`** - Content wrapper inside Tool

Example:
```typescript
<Tool defaultOpen={true}>
  <ToolHeader state={part.state} type="tool-myTool" />
  <ToolContent>
    {part.state === 'input-available' && <ToolInput input={part.input} />}
    {part.state === 'output-available' && (
      <ToolOutput output={<MyCustomRenderer data={part.output} />} />
    )}
  </ToolContent>
</Tool>
```

## Testing

Tool components are tested via:
- **E2E Tests** - Full message rendering flow with real/mock tool calls
- **React DevTools Profiler** - Verify memoization prevents unnecessary re-renders
- **Type Checking** - TypeScript catches prop mismatches and missing cases

## Best Practices

✅ **Do:**
- Use `memo()` with both `part` and `isReadonly` in equality check
- Set `displayName` for easier debugging in React DevTools
- Handle all `part.state` values appropriately
- Respect the `isReadonly` prop and disable interactions when true
- Add JSDoc comments explaining the component's purpose

❌ **Don't:**
- Forget to include `isReadonly` in the memoization equality check
- Call the router directly—use the central `<ToolUIRouter>` in `PreviewMessage`
- Assume tool output format—check the tool schema or add error handling
- Modify the message or tool state from within the component (UI-only responsibility)
