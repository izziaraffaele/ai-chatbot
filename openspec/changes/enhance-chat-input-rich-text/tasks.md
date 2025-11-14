# Implementation Tasks: Rich Text Chat Input with @Agent Mentions

## 1. Foundation - ProseMirror Setup

- [ ] 1.1 Create `lib/editor/mention-schema.ts` with mention mark and basic schema
- [ ] 1.2 Create `lib/editor/mention-plugin.ts` with ProseMirror mention detection plugin
- [ ] 1.3 Test schema validation and serialization (doc → JSON → plain text)

## 2. Agent Configuration

- [ ] 2.1 Create `lib/ai/agent-config.ts` with hardcoded agent definitions
- [ ] 2.2 Define agent structure: id, name, description, avatar (emoji or URL)
- [ ] 2.3 Initialize with known agents (researcher, and any others from current setup)

## 3. Rich Text Input Component

- [ ] 3.1 Create `components/elements/rich-text-input.tsx` wrapper around ProseMirror
- [ ] 3.2 Implement onChange handler to notify parent of text changes
- [ ] 3.3 Implement onSubmit handler (Enter key without Shift)
- [ ] 3.4 Support Shift+Enter for newlines (same as current textarea)
- [ ] 3.5 Serialize to plain text on output (preserves mention text)
- [ ] 3.6 Handle placeholder text and disabled state

## 4. Mention Autocomplete UI

- [ ] 4.1 Create `components/mention-autocomplete.tsx` floating menu component
- [ ] 4.2 Use Radix UI Command or Popper for positioning and keyboard navigation
- [ ] 4.3 Display agent list: avatar, name, description
- [ ] 4.4 Implement keyboard navigation (arrow keys, Enter to select, Esc to close)
- [ ] 4.5 Show "No agents found" when filter has no matches
- [ ] 4.6 Style mention badge inline: [🔍 Researcher] with distinctive appearance

## 5. Integration

- [ ] 5.1 Update `components/multimodal-input.tsx` to use RichTextInput instead of PromptInputTextarea
- [ ] 5.2 Verify form submission flow (value, onChange, onSubmit still work)
- [ ] 5.3 Test mention insertion and removal in integrated context
- [ ] 5.4 Verify message serialization to plain text

## 6. Styling & Accessibility

- [ ] 6.1 Style mention nodes with agent color (if defined) and distinct background
- [ ] 6.2 Add hover tooltips showing agent description
- [ ] 6.3 Ensure mention autocomplete is keyboard-navigable (ARIA labels)
- [ ] 6.4 Test dark mode styling for mention badges and autocomplete
- [ ] 6.5 Ensure focus management in autocomplete (trap focus while open)

## 7. Testing

- [ ] 7.1 Unit test: mention plugin detects @ and triggers correctly
- [ ] 7.2 Unit test: schema serialization (insert mention → JSON → plain text)
- [ ] 7.3 Component test: RichTextInput onChange and onSubmit handlers
- [ ] 7.4 Component test: Autocomplete filters agents by name
- [ ] 7.5 E2E test: Type @ → select agent → see mention inserted → send message
- [ ] 7.6 E2E test: Delete mention with backspace
- [ ] 7.7 E2E test: Multiple mentions in single message

## 8. Code Quality & Documentation

- [ ] 8.1 Run `pnpm lint` and fix any Ultracite issues
- [ ] 8.2 Run `pnpm format` to ensure consistent formatting
- [ ] 8.3 Update `CLAUDE.md` if new patterns introduced
- [ ] 8.4 Add inline comments for ProseMirror plugin complexity
- [ ] 8.5 Document agent config extension process

## 9. Verification & Cleanup

- [ ] 9.1 Manual testing: @mentions with single and multiple agents
- [ ] 9.2 Manual testing: Mention removal and re-insertion
- [ ] 9.3 Verify backward compatibility: messages still work without mentions
- [ ] 9.4 Check serialization: @researcher appears correctly in sent message
- [ ] 9.5 Verify Mastra routing: Mentioned agents are invoked appropriately
- [ ] 9.6 Performance: No lag during typing or autocomplete

## 10. Approval & Documentation

- [ ] 10.1 All tasks completed and passing tests
- [ ] 10.2 Code review passed
- [ ] 10.3 Update proposal.md if scope changed during implementation
- [ ] 10.4 Mark all tasks as complete before archiving change
