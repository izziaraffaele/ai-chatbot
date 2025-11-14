# Design: Consolidate Tool Call UI into Component-Based Architecture

## Context

Tool call UI rendering is the responsibility of `PreviewMessage` in `components/message.tsx`. Currently, all tool types are handled with a large switch statement that routes to custom UI components inline. As more tools are added, this file grows and becomes harder to maintain.

The refactoring consolidates tool UI rendering into a component-per-tool-type pattern, similar to successful patterns in the codebase (e.g., `artifacts/` directory with `textArtifact`, `codeArtifact`, etc.).

## Goals

- **Modularity:** Each tool's UI is self-contained in its own component
- **Maintainability:** New tools can be added without modifying core message rendering logic
- **Performance:** Memoization prevents unnecessary re-renders of unchanged tool parts
- **Type Safety:** Leverage TypeScript and Zod schemas for tool-specific types
- **Consistency:** Follow existing patterns in the codebase (artifact components as reference)

### Non-Goals

- Changing the message structure or data format
- Modifying tool execution or lifecycle (server-side)
- Breaking changes to public APIs
- Restructuring `PreviewMessage` props

## Decisions

### 1. **Component Location & Structure**

**Decision:** Create `components/tools/` directory with one file per tool type, plus optional router utility.

**Why:**
- Mirrors existing `artifacts/` pattern for consistency
- Collocates tool UI logic with tool concerns
- Easy to add new tools by adding new files
- Clear organization: `components/tools/weather-tool.tsx`, `components/tools/create-document-tool.tsx`, etc.

**Alternatives considered:**
- Keep tools in `components/elements/tool.tsx` subdirectory: less intuitive naming, harder to extend
- Inline all tool UI in `message.tsx`: already problematic, this change fixes it
- Single `ToolUIRenderer` component with all logic: still monolithic, no improvement

### 2. **Memoization Strategy**

**Decision:** Use `React.memo()` with deep equality check on both `part` and `isReadonly` props.

```typescript
export const WeatherToolUI = memo(
  ({ part, isReadonly, ...props }: WeatherToolUIProps) => {
    return <Tool>...</Tool>;
  },
  (prevProps, nextProps) => {
    return equal(prevProps.part, nextProps.part) &&
           prevProps.isReadonly === nextProps.isReadonly;
  }
);
```

**Why:**
- Prevents re-render when `part` and `isReadonly` data haven't changed
- Deep equality properly handles object comparisons for part
- Shallow equality sufficient for boolean isReadonly flag
- Matches existing pattern in `message.tsx` and `artifact.tsx`
- `isReadonly` affects rendering (disables interactive elements), so must be included in equality check

**Alternatives considered:**
- `useMemo` hook: more boilerplate, same performance
- Manual `shouldComponentUpdate`: class component syntax, not preferred in modern React
- Only check `part` equality: would miss isReadonly changes, causing stale UI

### 3. **Type Safety for Tool Parts**

**Decision:** Leverage AI SDK's `ToolUIPart<T>` generic type with union type for all tools.

```typescript
// In components/tools/weather-tool.tsx
import type { ToolUIPart } from 'ai';
import type { GetWeatherTool } from '@/mastra/agents';

type WeatherToolUIProps = {
  part: ToolUIPart<GetWeatherTool>;
};
```

**Why:**
- AI SDK already provides `ToolUIPart` generic
- Zod schemas in tool definitions auto-generate TypeScript types
- Type-safe access to `part.input`, `part.output`, `part.state`

**Alternatives considered:**
- Manual `interface WeatherToolPart`: duplicate definitions, hard to keep in sync
- `unknown` typing: loses safety, defeats the purpose

### 4. **Router Pattern**

**Decision:** Simple switch statement in `PreviewMessage` that maps `part.type` string to component.

```typescript
switch (part.type) {
  case 'tool-getWeather':
    return <WeatherToolUI key={part.toolCallId} part={part} />;
  case 'tool-createDocument':
    return <CreateDocumentToolUI key={part.toolCallId} part={part} />;
  // ...
}
```

**Why:**
- Straightforward and explicit
- TypeScript can narrow `part` type in each case
- No registry overhead or dynamic imports
- Easy to debug and maintain

**Alternatives considered:**
- Component registry: adds complexity, requires careful lifecycle management
- Higher-order component factory: boilerplate, harder to read
- Reflection-based routing: magic strings, harder to type-check

### 5. **Lifecycle Management Scope**

**Decision:** Each tool component manages:
- Visual state (expanded/collapsed collapsible)
- Conditional rendering (show input/output based on `part.state`)
- Custom renders (e.g., Weather component for weather output)
- Error display

**Out of scope:**
- Tool execution (server-side responsibility)
- Message storage (handled by `PreviewMessage`)
- State persistence across messages (not needed)

**Why:**
- Matches responsibility boundaries in the codebase
- Server-side tools already manage execution
- UI concerns stay in UI components

### 6. **Component Props Structure**

**Decision:** Pass entire `part` prop to tool components, plus `isReadonly` flag for state-based UI control.

```typescript
type WeatherToolUIProps = {
  part: ToolUIPart<GetWeatherTool>;
  isReadonly?: boolean; // disables actions when message is not editable
};
```

**Why:**
- Single source of truth for tool state (part)
- Clear control over interactivity via isReadonly flag
- Easy to extend with new part properties
- Matches existing `DocumentPreview` pattern with full part passing
- Avoids prop drilling of individual fields

**isReadonly Behavior:**
- When `isReadonly === true`, tool components SHALL disable any interactive elements (buttons, expandable sections, etc.)
- Tool components SHALL still render read-only display of results
- Used when displaying archived messages or read-only contexts
- MUST be included in memoization equality check since it affects rendering

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Memoization breaks reactivity if part/isReadonly updates undetectably | Unit test tool component re-renders; use `equal()` library already in use for part, === for isReadonly |
| isReadonly change not detected by memoization | Equality check explicitly compares both `part` and `isReadonly` to catch all state changes |
| Tool component APIs diverge (no shared interface) | Document expected props shape; consider `ToolUIComponent<T>` generic type in future |
| Missing tool type in switch case causes silent failure | TypeScript ensures exhaustive checks; test new tools before merging |
| Performance regression from component overhead | Measure with React DevTools; memoization prevents most re-renders |

## Migration Plan

1. **Phase 1:** Create tool component files and test locally
2. **Phase 2:** Update `PreviewMessage` to use new components (simple switch replacement)
3. **Phase 3:** Verify E2E tests pass, fix any edge cases
4. **Phase 4:** Remove old inline tool UI code from `PreviewMessage`
5. **Phase 5:** Document new pattern for adding tools

No user-facing changes, no database migrations, no deployment rollback needed.

## Open Questions

1. Should we create a `components/tools/README.md` documenting the pattern for new tool authors?
2. Should we add Storybook stories for each tool component for visual regression testing?

## Decisions Made

1. ✅ **isReadonly support:** Tool components will accept and respect the `isReadonly` prop, disabling interactive elements when true. This prop MUST be included in the memoization equality check.
