# Implementation Tasks

## 1. Core Registry Implementation

- [x] 1.1 Create dynamic registry class/object in `lib/ai/client-tools.ts` with `register()`, `deregister()`, and `getTools()` methods
- [x] 1.2 Implement state management for registered actions (in-memory Map)
- [x] 1.3 Make `deregister()` idempotent (safe to call multiple times)
- [x] 1.4 Add type definitions for registry object and registration API
- [x] 1.5 Export `clearAssistantActionsRegistry()` utility for testing

## 2. Hook Updates

- [x] 2.1 Update `useClientTools()` to return registry object
- [x] 2.2 Create new `useAssistantAction(action)` hook for registration in components
- [x] 2.3 Add `useEffect` to `useAssistantAction()` to register on mount and deregister on unmount
- [x] 2.4 Add TypeScript types for both hooks
- [x] 2.5 Ensure idempotent deregistration (safe on unmount)

## 3. Integration Updates

- [x] 3.1 Update `components/chat.tsx` to use new registry API
- [x] 3.2 Update `prepareSendMessagesRequest()` to call `registry.getTools()`
- [x] 3.3 Update any other files that import/use `useClientTools()` (verified: only chat.tsx used it)
- [ ] 3.4 Test that tools are properly serialized for the Mastra agent (requires E2E tests)

## 4. Example and Documentation

- [x] 4.1 Exported ClientTool type and documented registry pattern in code comments
- [x] 4.2 Add usage examples in hook JSDoc comments (useClientTools and useAssistantAction)
- [x] 4.3 Update `CLAUDE.md` "Common Patterns" section with assistant action registration example

## 5. Testing

- [ ] 5.1 Verify existing tests still pass with new API
- [ ] 5.2 Add tests for dynamic registration
- [ ] 5.3 Test that `useAssistantAction()` registers on mount and deregisters on unmount
- [ ] 5.4 Test that multiple components can register the same action safely
- [ ] 5.5 Test that `getTools()` returns all currently registered actions
- [ ] 5.6 Test that `deregister()` is idempotent (multiple calls don't error)
- [ ] 5.7 Test that `clearAssistantActionsRegistry()` removes all actions for test cleanup

## 6. Code Quality

- [ ] 6.1 Run `pnpm format` to fix code style
- [ ] 6.2 Run `pnpm lint` to check for errors
- [ ] 6.3 Verify no TypeScript errors
