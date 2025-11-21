# Refactor Chat Composer Architecture - Tasks

## Phase 1: Create ChatComposerProvider (Composer-level Context)

- [ ] Create `ChatComposerProvider` component in `components/chat/composer.tsx`
  - Extends `PromptInputProvider` with textareaRef sharing
  - Provides registration mechanism for textarea access
  - Manages composer-specific form state and status
  - Uses React context pattern for sharing within composer scope

- [ ] Implement `useChatComposerContext()` hook
  - Returns textareaRef, handleSubmit, and composer status
  - Provides textarea registration callback for components
  - Throws error if used outside ChatComposerProvider
  - Proper TypeScript types for all return values

- [ ] Update ChatComposer component to use ChatComposerProvider
  - Wrap PromptInput with ChatComposerProvider internally
  - Maintain existing component API and props
  - Ensure backward compatibility with current usage
  - Test that all ChatComposer variants still work

## Phase 2: Refactor ChatProvider (Global Context)

- [ ] Refactor existing ChatProvider in `components/chat/context.tsx`
  - Remove duplicated composer functionality
  - Keep global input text and attachments state
  - Maintain localStorage persistence for input
  - Preserve form submission logic and chat integration

- [ ] Implement `useChatContext()` hook
  - Returns global input state (value, setInput, clear)
  - Returns global attachments state (files, add, remove, clear)
  - Returns chat functions (sendMessage, status, chatId, stop)
  - Integrates with existing useChatRuntime and usePromptInputController

- [ ] Ensure ChatProvider continues to work with existing usage
  - Test current ChatProvider usage patterns
  - Verify all existing ChatProvider props still work
  - Confirm localStorage persistence remains functional
  - Check that form submission behavior is unchanged

## Phase 3: Update Components to Use New Context APIs

- [ ] Refactor ChatInput component
  - Replace `useChatComposer()` with `useChatContext()` and `useChatComposerContext()`
  - Maintain all existing props and render prop patterns
  - Ensure conditional actions still work correctly
  - Test all ChatInput variants (header, tools, actions)

- [ ] Update ChatComposerTool components
  - Refactor AttachmentMenu, AgentSelector, ContextUsage to use new hooks
  - Maintain namespace organization and component APIs
  - Ensure tools work correctly with both global and composer state
  - Test tool interactions with chat functionality

- [ ] Update ChatComposerAction components
  - Refactor Speech and Submit actions to use textareaRef from composer context
  - Maintain action behavior and props
  - Ensure speech button properly accesses shared textarea
  - Test action interactions with form submission

## Phase 4: Remove Legacy useChatComposer Hook

- [ ] Remove the redundant `useChatComposer()` hook from composer.tsx
  - Delete the hook implementation
  - Clean up any related imports or exports
  - Update JSDoc comments if necessary
  - Ensure no other files import the removed hook

- [ ] Update any remaining direct usages of useChatComposer
  - Search codebase for remaining `useChatComposer` imports
  - Replace with appropriate new hook calls
  - Update any custom components using the old hook
  - Run comprehensive tests to catch edge cases

## Phase 5: Validation and Testing

- [ ] Test multiple composer scenarios
  - Verify main chat composer works correctly
  - Test canvas composer with separate textareaRef
  - Ensure composers don't interfere with each other
  - Test composer mount/unmount behavior

- [ ] Test global state sharing
  - Verify input text accessible from any component
  - Test attachment state sharing between composers
  - Ensure localStorage persistence works
  - Test form submission with global state

- [ ] Validate backward compatibility
  - Test all existing ChatProvider usage patterns
  - Verify existing ChatInput props still work
  - Check that namespace exports (ChatComposerTool.*, ChatComposerAction.*) are unchanged
  - Run existing E2E tests to ensure no regressions

- [ ] Performance and error handling validation
  - Test hook usage outside providers throws appropriate errors
  - Verify no memory leaks from context subscriptions
  - Check that component unmounting properly cleans up state
  - Test error scenarios (network failures, invalid file types)

## Cleanup and Documentation

- [ ] Update JSDoc documentation for new hooks
  - Document `useChatContext()` with all return values
  - Document `useChatComposerContext()` with textarea sharing
  - Update component JSDoc to reflect new architecture
  - Add usage examples for new patterns

- [ ] Clean up any unused imports or exports
  - Remove any now-unused type definitions
  - Clean up import statements in affected files
  - Remove any commented-out legacy code
  - Run linting to catch unused variables

- [ ] Update any related documentation or examples
  - Update component usage examples if needed
  - Ensure README examples still work
  - Update any internal documentation referencing old hooks
  - Verify TypeScript types are accurate for new APIs