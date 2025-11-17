# Finalize Chat Primitives Refactor

## Summary
Complete the migration from monolithic chat components to composable AI Elements-based primitives through code-level cleanup, verification, and documentation. This change finalizes the refactoring work started in the checkpoint commit by removing deprecated code, renaming new implementations, and establishing comprehensive specifications.

## Motivation
The current codebase has duplicated chat components after introducing a new composable architecture based on AI Elements:
- `assistant-chat.tsx` (old) vs `assistant-chat-new.tsx` (new)
- `components/tools/` (old) vs `components/tools-new/` (new)
- Scattered message components vs organized `components/messages/`

We need to:
1. **Verify feature parity at code level** - Ensure new implementation covers all old functionality
2. **Clean up duplication** - Remove old implementations and rename `-new` suffixes
3. **Document the architecture** - Add comprehensive JSDoc comments and create specs
4. **Establish patterns** - Define the composable primitives pattern as a project standard

## Impact

### User-Facing Changes
- **No breaking changes** - All existing functionality preserved
- **Improved UX** - Better agent selector UI using AI Elements ModelSelector
- **Better performance** - More granular re-renders with composable architecture

### Developer-Facing Changes
- **New component structure** - `components/chat/*` primitives pattern
- **Cleaner API** - Namespace exports (`ChatComposerTool.*`, `ChatComposerAction.*`)
- **Better DX** - Centralized hooks (`useChatComposer`, `useDataStreamSubscription`, `useArtifactStreaming`)
- **Removed files** - Old implementations deleted after verification

### Technical Debt
- **Reduces duplication** - Single source of truth for chat components
- **Improves maintainability** - Clear separation of concerns with primitives
- **Better testability** - Smaller, focused components easier to test (tests in future proposal)

## Scope

### In Scope
1. **Code-level feature parity verification** between old and new implementations
2. **Remove old components**:
   - `components/assistant-chat.tsx` (old)
   - `components/chat-thread.tsx` (old)
   - `components/chat-message.tsx` (old)
   - `components/tools/*` (old)
   - `components/chat-artifact.tsx` (old implementation - may keep wrapper if needed)
3. **Rename `-new` suffix files**:
   - `components/assistant-chat-new.tsx` → `components/assistant-chat.tsx`
   - `components/tools-new/*` → `components/tools/*`
4. **Add comprehensive JSDoc comments** to all chat primitives:
   - `components/chat/composer.tsx`
   - `components/chat/thread.tsx`
   - `components/chat/canvas.tsx`
   - `components/chat/artifact.tsx`
   - `components/chat/streaming.tsx`
   - `components/chat/effects.tsx`
   - `components/chat/iterators.tsx`
   - `components/chat/message.tsx`
   - `components/chat/message-parts.tsx`
   - `components/chat/usage.tsx`
   - `components/chat/agent-selector.tsx`
   - `components/messages/*`
   - `components/artifacts/*`
5. **Create `chat-primitives` specification** documenting the new architecture
6. **Update `openspec/project.md`** to document new architecture patterns

### Out of Scope
- E2E test implementation (deferred to future proposal after cleanup)
- Changes to artifact rendering logic (already implemented)
- Changes to streaming infrastructure (already working)
- New features or functionality beyond parity
- Changes to authentication or database layers
- Performance optimization (unless blocking)

## Dependencies
- Requires AI Elements components (`@/components/elements/prompt-input`, `@/components/elements/model-selector`)
- Depends on existing hooks (`useChatRuntime`, `useArtifact`, `useChatVisibility`)
- No external library changes needed

## Risks
- **Low risk** - New implementation already functional and verified in build
- **Minor design issues** - Few small fixable issues identified during light verification
- **Mitigation** - Code-level review of all components before removal
- **Rollback** - Git history preserves old implementation if needed

## Implementation Guidelines

### Critical Rule: No Old Code Dependencies
**If during cleanup you discover that the new implementation still imports/depends on old code**, you MUST:
1. **STOP** the cleanup process
2. **Escalate to human feedback** immediately
3. **Do NOT keep old code "just in case"**

The new implementation should be fully independent. Any dependencies on old code indicate:
- Missing functionality in new implementation that needs to be added
- Improper refactoring that needs to be corrected
- Architecture issue that needs human review

This ensures we achieve true cleanup and don't perpetuate technical debt.

## Alternatives Considered
1. **Keep both implementations** - Rejected: Creates confusion and maintenance burden
2. **Gradual migration** - Rejected: Already have working new implementation
3. **Test first, clean later** - Rejected: Tests easier to write after cleanup is complete

## Success Criteria
- [ ] Build succeeds without errors or warnings
- [ ] Feature parity code review checklist completed (see tasks.md)
- [ ] All old component files removed
- [ ] All `-new` suffixes renamed
- [ ] JSDoc comments added to all primitives (100% coverage)
- [ ] `chat-primitives` spec created and validated with `openspec validate`
- [ ] `project.md` updated with new patterns
- [ ] No unused imports or dead code remains
- [ ] All minor design issues identified during verification are fixed
