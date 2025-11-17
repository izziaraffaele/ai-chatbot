# Implementation Tasks

## Phase 1: Create Suggestion Primitives

### 1.1 Create Chat Suggestion Provider
- [ ] Create `components/chat/suggestions.tsx` file
- [ ] Implement `ChatSuggestionProvider` component with context
- [ ] Add support for `initialSuggestions`, `suggestions`, `autoApply`, and `onApply` props
- [ ] Implement provider logic to merge initial and dynamic suggestions
- [ ] Add context interface with TypeScript types

### 1.2 Create Chat Suggestions Component
- [ ] Implement `ChatSuggestions` component in same file
- [ ] Add support for `suggestions`, `onApply`, and `mode` props
- [ ] Implement logic to use provider context or props
- [ ] Add prop override behavior (props take precedence over context)
- [ ] Implement null rendering when no suggestions available

### 1.3 Create Chat Suggestions Hook
- [ ] Implement `useChatSuggestions` hook in same file
- [ ] Add logic to return context data when provider exists
- [ ] Add fallback to minimal state when no provider
- [ ] Add proper TypeScript interfaces and null handling

### 1.4 Implement Layout Modes
- [ ] Implement default layout (responsive grid) using CSS Grid
- [ ] Implement minimal layout (horizontal slider) using existing `Suggestions` element
- [ ] Add responsive behavior for mobile/desktop in default mode
- [ ] Add proper spacing and styling for both layouts

### 1.5 Implement Auto-Apply Behavior
- [ ] Add runtime integration using `useChatRuntime()` and `usePromptInputController()`
- [ ] Implement `autoApply="input"` logic (populate prompt input and focus)
- [ ] Implement `autoApply="message"` logic (send as new message)
- [ ] Implement `autoApply="none"` logic (require custom onApply handler)
- [ ] Add error handling for runtime access failures

## Phase 2: Integration with Chat Components

### 2.1 Update Chat Composer
- [ ] Modify `components/chat/composer.tsx` to support suggestions
- [ ] Add logic to display suggestions only when chat is empty
- [ ] Update `ChatInput` component to properly render header content
- [ ] Add suggestions to composer header with responsive mode selection
- [ ] Test integration with existing composer functionality

### 2.2 Update Assistant Chat
- [ ] Modify `components/assistant-chat.tsx` to integrate suggestion provider
- [ ] Wrap `ChatSuggestionProvider` within `ChatProvider` for runtime access
- [ ] Add default suggestions or integrate with existing suggestion sources
- [ ] Configure appropriate auto-apply behavior for the application
- [ ] Test provider nesting and context access

### 2.3 Wire Up Suggestion Data
- [ ] Connect suggestion data source (from `useDemoConfig` or similar)
- [ ] Add default suggestions for new chats
- [ ] Ensure suggestions work correctly with existing chat flow
- [ ] Test suggestion persistence and behavior across chat sessions

## Phase 3: Testing and Validation

### 3.1 Component Testing
- [ ] Test `ChatSuggestions` renders with props-only usage
- [ ] Test `ChatSuggestions` renders with provider context
- [ ] Test prop override behavior (props override context)
- [ ] Test null rendering when no suggestions provided
- [ ] Test both layout modes (default grid, minimal slider)

### 3.2 Provider Testing
- [ ] Test `ChatSuggestionProvider` with all auto-apply modes
- [ ] Test provider nesting within `ChatProvider`
- [ ] Test suggestion merging (initial + dynamic)
- [ ] Test custom `onApply` handler functionality
- [ ] Test context access via `useChatSuggestions` hook

### 3.3 Integration Testing
- [ ] Test suggestions display in empty chat state
- [ ] Test suggestions hide when chat has messages
- [ ] Test suggestion clicking with different auto-apply modes
- [ ] Test responsive behavior on mobile and desktop
- [ ] Test accessibility and keyboard navigation

### 3.4 End-to-End Testing
- [ ] Start new chat and verify suggestions appear
- [ ] Click suggestion with autoApply="input" and verify input population
- [ ] Click suggestion with autoApply="message" and verify message sending
- [ ] Test custom onApply handler functionality
- [ ] Verify no console errors or warnings

## Phase 4: Cleanup and Documentation

### 4.1 Remove Deprecated Code
- [ ] Remove `hooks/use-prompt-suggestions.ts` file
- [ ] Search for any remaining usage of old hook and update
- [ ] Remove any imports of deprecated hook
- [ ] Verify build succeeds after removal

### 4.2 Update Documentation
- [ ] Add JSDoc comments to all new components and hooks
- [ ] Document provider pattern and auto-apply behavior
- [ ] Add usage examples for different scenarios
- [ ] Update any relevant project documentation

### 4.3 Final Validation
- [ ] Run `pnpm lint` and fix any issues
- [ ] Run `pnpm build` and verify success
- [ ] Run `openspec validate add-prompt-suggestions --strict`
- [ ] Manual browser testing of complete flow
- [ ] Verify all success criteria are met

## Success Criteria Checklist

### Functional Requirements
- [ ] Provider pattern works with optional context and proper nesting
- [ ] Component renders with props-only usage (returns null when no suggestions)
- [ ] Both grid and slider layouts functional and responsive
- [ ] Auto-apply behavior works for both input population and message sending
- [ ] Clean integration with existing chat composer and runtime

### Technical Requirements
- [ ] Maintains accessibility and responsive design patterns
- [ ] Old hook properly removed with no remaining usage
- [ ] TypeScript interfaces complete and type-safe
- [ ] No console errors or warnings in development
- [ ] Build passes without issues

### User Experience Requirements
- [ ] Suggestions appear only when appropriate (empty chat state)
- [ ] Suggestion clicks provide immediate, intuitive feedback
- [ ] Responsive behavior works correctly on all screen sizes
- [ ] Keyboard navigation and screen reader support maintained
- [ ] Performance impact minimal with proper memoization