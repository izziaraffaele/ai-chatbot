# Tasks: Refactor MultimodalInput with AI Elements Components

## 1. Create MessageInput Component

- [ ] 1.1 Extract existing PromptInput composition from MultimodalInput → new `components/message-input.tsx`
  - Copy the PromptInput structure already used in MultimodalInput (lines 298-386)
  - The composition pattern (PromptInput, PromptInputTextarea, PromptInputToolbar) already exists
  - Accept props: `chatId`, `input`, `setInput`, `status`, `stop`, `attachments`, `setAttachments`, `messages`, `setMessages`, `sendMessage`, `selectedVisibilityType`, `usage`
  - Note: This is a code move (consolidation), not a new implementation

- [ ] 1.2 Migrate file upload logic to MessageInput
  - Copy `uploadFile()` function from MultimodalInput
  - Copy `handleFileChange()` logic for file selection
  - Set up file input ref management

- [ ] 1.3 Migrate paste event handling to MessageInput
  - Copy `handlePaste()` logic
  - Attach paste listener to textarea via `useEffect`
  - Ensure image paste uploads work identically

- [ ] 1.4 Migrate textarea height adjustment to MessageInput
  - Copy `adjustHeight()` and `resetHeight()` functions
  - Set up textarea ref and auto-resize behavior
  - Maintain minHeight=44 and maxHeight=200

- [ ] 1.5 Migrate input persistence to MessageInput
  - Use `useLocalStorage('input', '')` hook
  - Copy localStorage sync logic from MultimodalInput
  - Ensure hydration handling works correctly

- [ ] 1.6 Migrate form submission logic to MessageInput
  - Copy `submitForm()` function
  - Ensure message parts array includes attachments correctly
  - Copy toast error handling for status checks

- [ ] 1.7 Add AgentSelector integration to toolbar
  - Import AgentSelector component
  - Place inside `PromptInputTools` alongside attachment button
  - Ensure proper styling and toolbar integration

## 2. Add PromptInput Composition Details

- [ ] 2.1 Set up PromptInput structure
  - Configure container classes: `rounded-xl border border-border bg-background p-3 shadow-xs transition-all`
  - Set up attachment preview area with PreviewAttachment components
  - Implement flexbox layout for textarea and context area

- [ ] 2.2 Configure textarea element
  - Use `PromptInputTextarea` from AI Elements
  - Set classes for transparent, borderless appearance
  - Configure auto-resize with proper height constraints
  - Ensure placeholder and value binding work correctly

- [ ] 2.3 Configure toolbar with buttons
  - Use `PromptInputToolbar` and `PromptInputTools` for layout
  - Add AttachmentsButton (file upload trigger)
  - Add AgentSelector
  - Add StopButton (conditional, when status === 'submitted')
  - Add PromptInputSubmit button with arrow icon

## 3. Handle Suggested Actions and Context

- [ ] 3.1 Implement suggested actions rendering
  - Render `SuggestedActions` component above MessageInput when conversation is empty
  - Copy conditional logic from MultimodalInput

- [ ] 3.2 Implement context area
  - Use existing `Context` component from elements
  - Place in flex row with textarea
  - Pass `usage` prop for display

## 4. Update Type Definitions

- [ ] 4.1 Define MessageInput props interface
  - Ensure all MultimodalInput props are supported
  - Add JSDoc comments for clarity
  - Ensure type compatibility with chat route

- [ ] 4.2 Define extracted helper component types
  - AttachmentsButton props
  - StopButton props
  - Any other sub-components created during refactor

## 5. Test MessageInput Implementation

- [ ] 5.1 Manual smoke test - basic input
  - Verify textarea accepts input
  - Verify input clears after message send
  - Verify localStorage persistence works

- [ ] 5.2 Manual smoke test - file uploads
  - Test file selection via button
  - Verify attachment previews appear
  - Test attachment removal
  - Test paste image upload

- [ ] 5.3 Manual smoke test - agent selection
  - Verify agent dropdown works in toolbar
  - Test switching agents
  - Verify selection state reflects properly

- [ ] 5.4 Manual smoke test - edge cases
  - Verify send button disabled state
  - Verify stop button appears when streaming
  - Verify suggested actions appear on empty conversation
  - Test height adjustment with multiline input

## 6. Migrate Chat Routes

- [ ] 6.1 Update chat page imports
  - Replace `MultimodalInput` import with `MessageInput`
  - Update `app/(chat)/page.tsx` or relevant routes

- [ ] 6.2 Update component usage
  - Replace `<MultimodalInput {...props} />` with `<MessageInput {...props} />`
  - Verify all required props are passed
  - Test in browser to ensure no prop-related errors

## 7. Run Test Suite

- [ ] 7.1 Run Playwright E2E tests
  - Execute `pnpm test`
  - Verify all tests pass
  - Fix any failing tests related to input area

- [ ] 7.2 Run linter and formatter
  - Execute `pnpm lint`
  - Execute `pnpm format`
  - Ensure no code quality issues

## 8. Cleanup and Documentation

- [ ] 8.1 Remove or deprecate old components
  - Decide: remove `MultimodalInput.tsx` and `AgentSelector.tsx` or keep AgentSelector for reuse
  - Update imports throughout codebase if needed
  - Remove `<MultimodalInput>` from any other locations

- [ ] 8.2 Update documentation if needed
  - Check CLAUDE.md for any references to MultimodalInput
  - Update architecture section if custom input pattern changed

- [ ] 8.3 Final validation
  - Run full test suite one more time
  - Verify all E2E tests pass
  - Manual testing of complete chat flow (login → send message → agent switch → file upload → artifact creation)

## Validation Criteria

- ✓ MessageInput component created with feature parity to MultimodalInput
- ✓ All file upload tests pass (single file, multiple files, paste images)
- ✓ All agent selection tests pass (dropdown works in toolbar)
- ✓ Input persistence works (localStorage saves/restores)
- ✓ Paste events work correctly (images upload, text pastes normally)
- ✓ Height adjustment works (textarea grows/shrinks with content)
- ✓ All Playwright E2E tests pass
- ✓ Linter and formatter pass
- ✓ No TypeScript errors
