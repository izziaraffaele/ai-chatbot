# Design: Dynamic Assistant Actions Registry

## Context

Currently, assistant actions (client-side tools) are statically defined in a module and imported. This prevents dynamic registration from React components, limiting extensibility. We need a registry pattern that:

- Supports runtime action registration from any component
- Maintains a single source of truth for available actions
- Works seamlessly with Mastra agent integration
- Handles component lifecycle (register on mount, deregister on unmount)
- Provides clean developer ergonomics

## Goals

- Enable dynamic action registration from React components via `useAssistantAction()` hook
- Keep `useClientTools()` working but return registry object instead of static tools
- Maintain type safety with TypeScript and Zod
- Ensure actions are properly available to the Mastra agent during chat
- Clean up actions when components unmount (lifecycle management)

## Non-Goals

- Persist registered actions across page refreshes (in-memory registry is sufficient)
- Support removing/unregistering actions manually (automatic on unmount only)
- Share registry state across browser tabs
- Create a full plugin system with versioning or dependencies

## Decisions

### 1. Registry Pattern: Global In-Memory Store with Lifecycle

**What:** Implement registry as a singleton in `lib/ai/client-tools.ts` that maintains actions in a `Map`. Provide both `register()` and `deregister()` methods. Hook handles mount/unmount lifecycle.

**Why:**
- Simple, fast, and predictable
- Works well with React's component lifecycle
- No async initialization needed
- Sufficient for single-page application lifecycle
- Automatic cleanup prevents stale actions from accumulating

**Alternatives considered:**
- Context API: Adds complexity for global state; registry is consumed by single chat component
- Zustand/Jotai: Over-engineered for this use case
- Manual cleanup: Developers must remember to deregister; error-prone

### 2. Hook Implementation: useClientTools Returns Registry, useAssistantAction Wraps It

**What:**
- `useClientTools()` returns the registry object (methods: `register(action)`, `deregister(id)`, `getTools()`)
- `useAssistantAction(action)` is a hook that:
  - Calls `useClientTools().register(action)` on mount
  - Returns a cleanup function that deregisters on unmount
  - Uses `useEffect` to manage lifecycle

**Why:**
- Clear, semantic naming: `useAssistantAction` communicates "I'm registering an action"
- Automatic cleanup via useEffect dependency array
- Avoids manual deregistration errors
- Idiomatic React hook pattern

**Example:**
```tsx
function MyComponent() {
  useAssistantAction(myCustomAction); // Auto-registers on mount, deregisters on unmount
}
```

### 3. Deregistration Semantics: Safe ID-Based Removal

**What:** `deregister(id)` removes action by ID. Safe to call multiple times for same ID.

**Why:**
- Idempotent: multiple calls don't cause errors
- Compatible with React strict mode (double-unmount safety)
- Simple mental model

### 4. Timing: Register at Component Mount, Available for Next Message

**What:** Actions are registered when component mounts and available for subsequent chat messages. Deregistered when component unmounts.

**Why:**
- Matches React component lifecycle
- Natural for feature-specific tools loaded with feature components
- Actions registered during a message stream not available until next message (acceptable)
- Prevents stale actions from accumulating

### 5. Type Safety: Preserve Zod + TypeScript

**What:** Registry and hooks maintain full TypeScript types; Zod validation unchanged.

**Why:**
- Ensures developers get IDE autocomplete
- Catches schema mismatches at build time
- Consistent with existing codebase patterns

## Migration Plan

1. **Phase 1 (prep):** Create registry with `register()`, `deregister()`, and `getTools()` in `lib/ai/client-tools.ts`
2. **Phase 2 (hooks):** Update `useClientTools()` to return registry; create `useAssistantAction()` with lifecycle
3. **Phase 3 (integration):** Update chat component to use new registry API
4. **Phase 4 (cleanup):** Remove old `getClientTools()` export

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Action not available during current message stream | Document in JSDoc; acceptable constraint |
| Unmount order issues with multiple components | Deregister is idempotent; safe regardless of order |
| Testing with global registry | Provide `clearRegistry()` utility for test cleanup |
| Large number of actions affects performance | Actions are small objects; Map operations are O(1); no perf risk |
| Accidental deregistration if multiple hooks share same action ID | Document: one hook per action ID; if shared, component should manage lifecycle |

## Open Questions

- Should we provide a `clearRegistry()` function for testing? (Recommendation: Yes, export from `lib/ai/client-tools.ts`)
- Should we log/warn when actions are registered? (Recommendation: No, keep silent; not needed)
- Should we prevent re-registration of same ID? (Recommendation: No, silent overwrite is safe and compatible with lifecycle)
