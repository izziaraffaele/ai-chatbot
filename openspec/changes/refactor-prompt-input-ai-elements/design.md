# Design: Refactor MultimodalInput with AI Elements Components

## Context

The application currently uses custom components (`MultimodalInput`, `AgentSelector`) for the chat input area. Vercel's AI Elements library provides `PromptInput` and related composable components that handle many of the same concerns (attachment management, input state, composition patterns). This refactoring consolidates our custom input logic into a new `MessageInput` wrapper that composes AI Elements components with our app-specific concerns (agent selection, file upload endpoints, persistence).

**Key stakeholders:**
- Chat interface (`app/(chat)/page.tsx`)
- Input state management (React hooks, localStorage)
- File upload system (`/api/files/upload`)
- Agent orchestration (`lib/ai/agent-config`)

## Goals

- **Reduce custom code** by 30-40% in input-related components
- **Improve composability** of input UI through standard patterns
- **Maintain feature parity** during transition (all existing features work identically)
- **Standardize on AI Elements patterns** for better ecosystem alignment

### Non-Goals

- Modify installed AI Elements components in `components/elements/`
- Change message serialization format or database schema
- Break existing API contracts (deprecate, don't remove)

## Decisions

### 1. New `MessageInput` Component Location

**Decision**: Create `components/message-input.tsx` as a new top-level component that wraps AI Elements `PromptInput`.

**Rationale**:
- Keeps app-specific logic (agent selection, persistence, upload endpoints) separate from library components
- Prevents coupling between internal implementation and external library version updates
- Clear separation: `components/elements/*` = installed libraries, `components/*` = app-specific compositions

**Alternatives considered**:
- Creating inside `components/elements/` - violates constraint about not modifying installed components
- Creating deeply nested structure - adds unnecessary indirection

### 2. AgentSelector Composability

**Decision**: Keep `AgentSelector` as-is but integrate into PromptInput toolbar via `<PromptInputTools>`.

**Rationale**:
- Minimizes changes to existing dropdown implementation
- Current placement in toolbar is already correct (see MultimodalInput line 366)
- Preserves existing styling and behavior
- Can be reused in future features if needed

**Alternatives considered**:
- Refactoring to use Popover instead of Dropdown - larger refactor, lower priority
- Creating separate AgentSelectorTool component - adds complexity without clear benefit

### 3. Input State Management

**Decision**: Keep parent-managed state flow (current pattern). Do NOT lift state to PromptInputProvider.

**Rationale**:
- Zero behavior change - input state continues to flow from parent `useChat()`
- Attachments continue to be managed by parent component
- localStorage persistence continues to work identically
- Minimizes risk of breaking chat functionality
- Future: PromptInputProvider pattern could be explored in separate refactor if benefits warrant

**Current pattern (no change)**:
```
useChat() manages: input, setInput, attachments, setAttachments
         ↓
MessageInput receives as props
         ↓
PromptInput sub-components render with prop values
```

### 4. Attachment Handling Strategy

**Decision**: Keep parent-managed attachments (current pattern). Leverage AI Elements components for rendering only.

**Rationale**:
- Avoids duplicate state management for file lifecycle
- AI Elements handles core concerns (add, remove, clear operations)
- We only need to handle app-specific upload logic (endpoint, error handling, persistence)

**Implementation details**:
```typescript
// Use AI Elements attachment context
const { files, add, remove, clear } = useAttachments();

// App handles upload via our endpoint
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/files/upload', { ... });
  return response.json();
};
```

### 5. Input Persistence Strategy

**Decision**: Keep localStorage-based input persistence in `MessageInput`.

**Rationale**:
- Already working reliably with existing implementation
- Not a core AI Elements concern
- App-specific requirement (localStorage key management)

### 6. Migration Path

**Decision**: Deprecate `MultimodalInput`, migrate all call sites to `MessageInput` in single PR.

**Rationale**:
- Avoids maintaining dual implementations
- Cleaner git history
- All features validated together before removing old component

**Timeline**:
1. Create `MessageInput` with full feature parity
2. Update all chat routes to use `MessageInput`
3. Run full test suite and E2E tests
4. Remove `MultimodalInput` and `AgentSelector` (if fully integrated into MessageInput)

## Risks & Trade-offs

| Risk | Mitigation |
|------|-----------|
| Breaking chat input during refactor | Run E2E tests at each step; maintain backward-compatible API |
| Losing custom features (paste events, height adjustment) | Test all edge cases; ensure feature coverage in MessageInput |
| Increased complexity in MessageInput | Keep composition simple; split into sub-components if >200 lines |
| AI Elements version updates break composition | Document interface assumptions; plan for future updates |

## Migration Plan

### Phase 1: Create MessageInput (commits 1-2)
- Create `components/message-input.tsx` with MultimodalInput logic
- Ensure feature parity via TypeScript types and manual testing
- No breaking changes to public API

### Phase 2: Update Chat Routes (commits 3-4)
- Replace `<MultimodalInput />` with `<MessageInput />` in chat interface
- Update prop names if needed (backward compat layer if necessary)
- Run E2E tests; fix any issues

### Phase 3: Cleanup (commit 5)
- Remove `MultimodalInput.tsx`
- Remove `AgentSelector.tsx` if fully integrated, or keep if reusable elsewhere
- Update imports

### Phase 4: Testing & Validation
- Run full `pnpm test` suite
- Manual smoke testing in dev environment
- Verify all file upload, paste, and agent selection flows work

## Open Questions

1. Should `AgentSelector` remain a separate component, or fully integrate into `MessageInput`?
   - **Provisional answer**: Keep separate for potential reuse in future features (e.g., quick-switch in sidebar)

2. What's the intended API for `MessageInput` props? Should it accept the same props as current `MultimodalInput`?
   - **Provisional answer**: Yes, maintain API compatibility to minimize migration effort

3. How should we handle the `suggested-actions` component that currently appears above the input?
   - **Provisional answer**: Keep inside MessageInput as part of the composition; treat as part of input area UI

## Deployment Considerations

- **Database**: No schema changes
- **API**: No endpoint changes
- **Backward compatibility**: Yes, with deprecation period
- **Testing**: Full E2E regression test pass required before merge
