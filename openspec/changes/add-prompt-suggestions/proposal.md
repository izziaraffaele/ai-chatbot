# Add Prompt Suggestions with Provider Pattern

## Summary
Restore prompt suggestions functionality using a modern provider pattern with optional context provider and component-based rendering, following AI Elements conventions.

## Background
During the chat primitives refactor, prompt suggestions were removed. The old `usePromptSuggestions` hook exists but is unused. This proposal introduces a clean provider pattern that:

1. **Modernizes the approach** - Remove `usePromptSuggestions` (keep `useDemoConfig`)
2. **Introduces provider pattern** - Optional `ChatSuggestionProvider` for global suggestion management
3. **Supports prop-based rendering** - `ChatSuggestions` works with or without provider
4. **Follows AI Elements pattern** - Consistent with existing chat architecture

## Proposed Solution

### Architecture Pattern
```tsx
// Provider nested within ChatProvider for runtime access
<ChatProvider>
  <ChatSuggestionProvider
    initialSuggestions={[]}
    suggestions={[]}
    autoApply="input" // 'input' | 'message' | 'none'
    onApply={(suggestion) => {}} // Optional custom handler
  >
    <ChatSuggestions /> // Uses context data with auto-apply behavior
    <ChatSuggestions suggestions={["Custom"]} onApply={() => {}}/> // Override with props
    <ChatSuggestions mode="minimal" /> // Slider instead of grid
  </ChatSuggestionProvider>
</ChatProvider>

// Without provider - props only
<ChatProvider>
  <ChatSuggestions
    suggestions={["A", "B"]}
    onApply={(suggestion) => {}} // Manual handling required
  />
</ChatProvider>
```

### Key Components

#### 1. ChatSuggestionProvider (`@components/chat/suggestions.tsx`)
- Nested within `ChatProvider` for runtime access to chat and prompt input
- Merges `initialSuggestions` with dynamic `suggestions` array
- Configurable auto-apply behavior: `autoApply="input" | "message" | "none"`
  - `"input"` - Sets suggestion in prompt input (default)
  - `"message"` - Sends suggestion as new message immediately
  - `"none"` - Requires custom `onApply` handler
- Optional `onApply` callback for custom suggestion handling
- Exposes context via `useChatSuggestions()` hook

#### 2. ChatSuggestions Component (`@components/chat/suggestions.tsx`)
- Works with or without provider context
- Accepts optional props to override/context data:
  - `suggestions?: string[]` - Suggestion array (overrides context)
  - `onApply?: (suggestion: string) => void` - Click handler (overrides context)
  - `mode?: 'default' | 'minimal'` - Layout mode
- Renders nothing when no suggestions available
- Uses existing `Suggestions` and `Suggestion` elements

#### 3. useChatSuggestions Hook (`@components/chat/suggestions.tsx`)
- Returns suggestion context or `null` when no provider
- Hook follows existing chat primitive patterns
- Type-safe with proper TypeScript interfaces

### Layout Modes
- **`'default'`** - 2-column responsive grid (like old multimodal-input)
- **`'minimal'`** - Horizontal scrolling slider (using existing Suggestions element)

### Integration Points
- **ChatComposer** - Add `ChatSuggestions` to header when chat is empty
- **AssistantChat** - Wrap `ChatSuggestionProvider` within `ChatProvider`
- **Existing Elements** - Reuse `Suggestions` and `Suggestion` from `@components/elements/suggestion.tsx`
- **Runtime Access** - Provider uses `useChatRuntime()` and `usePromptInputController()` for auto-apply

## Migration Plan
1. Create new suggestion primitives with provider pattern
2. Update `ChatComposer` to include suggestions in header
3. Add suggestions to `AssistantChat` with proper provider nesting
4. Remove deprecated `usePromptSuggestions` hook

## Success Criteria
- Provider pattern works with optional context and proper nesting
- Component renders with props-only usage (returns null when no suggestions)
- Both grid and slider layouts functional
- Auto-apply behavior works for both input population and message sending
- Clean integration with existing chat composer and runtime
- Maintains accessibility and responsive design
- Old hook properly removed

## Files to Create/Modify

### New Files
- `components/chat/suggestions.tsx` - Suggestion primitives with provider pattern

### Modified Files
- `components/chat/composer.tsx` - Add suggestions to composer header
- `components/assistant-chat.tsx` - Integrate suggestions with proper provider nesting

### File Removals
- `hooks/use-prompt-suggestions.ts` - Remove deprecated hook

### Files to Keep (No Changes)
- `config/demo.schema.ts` - Keep as is (used elsewhere in application)