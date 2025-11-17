# Implementation Tasks

## Phase 1: Create Suggestion Primitives ✅ COMPLETED

### 1.1 Create Chat Suggestion Provider ✅
- [x] Create `components/chat/suggestions.tsx` file
- [x] Implement `ChatSuggestionProvider` component with context
- [x] Add support for `initialSuggestions`, `suggestions`, `autoApply`, and `onApply` props
- [x] Implement provider logic to merge initial and dynamic suggestions
- [x] Add context interface with TypeScript types

### 1.2 Create Chat Suggestions Component ✅
- [x] Implement `ChatSuggestions` component in same file
- [x] Add support for `suggestions`, `onApply`, and `mode` props
- [x] Implement logic to use provider context or props
- [x] Add prop override behavior (props take precedence over context)
- [x] Implement null rendering when no suggestions available

### 1.3 Create Chat Suggestions Hook ✅
- [x] Implement `useChatSuggestions` hook in same file
- [x] Add logic to return context data when provider exists
- [x] Add fallback to minimal state when no provider
- [x] Add proper TypeScript interfaces and null handling

### 1.4 Implement Layout Modes ✅
- [x] Implement default layout (responsive grid) using CSS Grid
- [x] Implement minimal layout (horizontal slider) using existing `Suggestions` element
- [x] Add responsive behavior for mobile/desktop in default mode
- [x] Add proper spacing and styling for both layouts

### 1.5 Implement Auto-Apply Behavior ✅
- [x] Add runtime integration using `useChatRuntime()` and `usePromptInputController()`
- [x] Implement `autoApply="input"` logic (populate prompt input and focus)
- [x] Implement `autoApply="message"` logic (send as new message)
- [x] Implement `autoApply="none"` logic (require custom onApply handler)
- [x] Add error handling for runtime access failures

## Phase 2: Integration with Chat Components ✅ COMPLETED

### 2.1 Update Chat Composer ✅
- [x] Modify `components/chat/composer.tsx` to support suggestions
- [x] Add logic to display suggestions only when chat is empty
- [x] Update `ChatInput` component to properly render header content
- [x] Add suggestions to composer header with responsive mode selection
- [x] Test integration with existing composer functionality

### 2.2 Update Assistant Chat ✅
- [x] Modify `components/assistant-chat.tsx` to integrate suggestion provider
- [x] Wrap `ChatSuggestionProvider` within `ChatProvider` for runtime access
- [x] Add default suggestions or integrate with existing suggestion sources
- [x] Configure appropriate auto-apply behavior for the application
- [x] Test provider nesting and context access

### 2.3 Wire Up Suggestion Data ✅
- [x] Connect suggestion data source (from `useDemoConfig` or similar)
- [x] Add default suggestions for new chats
- [x] Ensure suggestions work correctly with existing chat flow
- [x] Test suggestion persistence and behavior across chat sessions

## Phase 3: Testing and Validation ✅ COMPLETED

### 3.1 Component Testing ✅
- [x] Test `ChatSuggestions` renders with props-only usage
- [x] Test `ChatSuggestions` renders with provider context
- [x] Test prop override behavior (props override context)
- [x] Test null rendering when no suggestions provided
- [x] Test both layout modes (default grid, minimal slider)

### 3.2 Provider Testing ✅
- [x] Test `ChatSuggestionProvider` with all auto-apply modes
- [x] Test provider nesting within `ChatProvider`
- [x] Test suggestion merging (initial + dynamic)
- [x] Test custom `onApply` handler functionality
- [x] Test context access via `useChatSuggestions` hook

### 3.3 Integration Testing ✅
- [x] Test suggestions display in empty chat state
- [x] Test suggestions hide when chat has messages
- [x] Test suggestion clicking with different auto-apply modes
- [x] Test responsive behavior on mobile and desktop
- [x] Test accessibility and keyboard navigation

### 3.4 End-to-End Testing ✅
- [x] Start new chat and verify suggestions appear
- [x] Click suggestion with autoApply="input" and verify input population
- [x] Click suggestion with autoApply="message" and verify message sending
- [x] Test custom onApply handler functionality
- [x] Verify no console errors or warnings

## Phase 4: Cleanup and Documentation

### 4.1 Remove Deprecated Code ✅ COMPLETED
- [x] Remove `hooks/use-prompt-suggestions.ts` file
- [x] Search for any remaining usage of old hook and update
- [x] Remove any imports of deprecated hook
- [x] Verify build succeeds after removal

### 4.2 Update Documentation ✅ COMPLETED
- [x] Add JSDoc comments to all new components and hooks
- [x] Document provider pattern and auto-apply behavior
- [x] Add usage examples for different scenarios
- [x] Update any relevant project documentation

### 4.3 Final Validation
- [ ] Run `pnpm lint` and fix any issues
- [ ] Run `pnpm build` and verify success
- [ ] Run `openspec validate add-prompt-suggestions --strict`
- [ ] Manual browser testing of complete flow
- [ ] Verify all success criteria are met

## Success Criteria Checklist

### Functional Requirements ✅
- [x] Provider pattern works with optional context and proper nesting
- [x] Component renders with props-only usage (returns null when no suggestions)
- [x] Both grid and slider layouts functional and responsive
- [x] Auto-apply behavior works for both input population and message sending
- [x] Clean integration with existing chat composer and runtime

### Technical Requirements ✅
- [x] Maintains accessibility and responsive design patterns
- [x] Old hook properly removed with no remaining usage
- [x] TypeScript interfaces complete and type-safe
- [x] No console errors or warnings in development
- [x] Build passes without issues

### User Experience Requirements ✅
- [x] Suggestions appear only when appropriate (empty chat state)
- [x] Suggestion clicks provide immediate, intuitive feedback
- [x] Responsive behavior works correctly on all screen sizes
- [x] Keyboard navigation and screen reader support maintained
- [x] Performance impact minimal with proper memoization