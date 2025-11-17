# Chat Suggestions Specification

## Overview

This specification defines the Chat Suggestions system implemented as a modern provider pattern with optional context support and component-based rendering, following AI Elements conventions.

## Implementation Status

✅ **FULLY IMPLEMENTED** - All components, hooks, and integrations are complete and functional.

## Architecture

### Core Components

#### 1. ChatSuggestionProvider

**Location:** `components/chat/suggestions.tsx:92-176`

**Purpose:** Provides suggestion state and auto-apply behavior within the ChatProvider context.

**Props:**
- `initialSuggestions?: string[]` - Initial suggestions to set the context value
- `suggestions?: string[]` - Current suggestions (overrides initial)
- `autoApply?: ChatSuggestionAutoApply` - Auto-apply behavior mode (`"input" | "message" | "none"`)
- `onApply?: (suggestion: string) => void` - Custom handler for suggestion application
- `children: ReactNode` - Child components

**Features:**
- Must be nested within `ChatProvider` for runtime access
- Merges `initialSuggestions` with dynamic `suggestions` array
- Supports three auto-apply modes:
  - `"input"` - Sets suggestion in prompt input and focuses (default)
  - `"message"` - Sends suggestion as new message immediately
  - `"none"` - Requires custom `onApply` handler
- Memoized context value to prevent unnecessary re-renders

#### 2. ChatSuggestions Component

**Location:** `components/chat/suggestions.tsx:235-312`

**Purpose:** Renders suggestions using different layout modes and works with or without provider context.

**Props:**
- `suggestions?: string[]` - Suggestion array (overrides provider context)
- `onApply?: (suggestion: string) => void` - Custom click handler (overrides provider context)
- `mode?: "default" | "minimal"` - Layout mode
- `className?: string` - Additional className for styling
- `animate?: boolean` - Enable/disable animations

**Layout Modes:**
- **`"default"`** - Responsive 2-column grid using CSS Grid
- **`"minimal"`** - Horizontal scrolling slider using existing `Suggestions` element

**Behavior:**
- Props always override context data
- Renders nothing (`null`) when no suggestions available
- Uses existing `Suggestion` and `Suggestions` elements from `@/components/elements/suggestion.tsx`
- Supports Framer Motion animations with staggered delays

#### 3. useChatSuggestions Hook

**Location:** `components/chat/suggestions.tsx:194-209`

**Purpose:** Access suggestion context from `ChatSuggestionProvider`.

**Returns:** `ChatSuggestionContext` interface

**Behavior:**
- Returns context data when provider exists
- Returns minimal state (`{ hasProvider: false }`) when no provider
- Type-safe with proper TypeScript interfaces

### Integration Points

#### AssistantChat Integration

**Location:** `components/assistant-chat.tsx:91-96, 189`

The `AssistantChat` component:
- Wraps content with `ChatSuggestionProvider` (lines 91-96)
- Passes through suggestion-related props (`initialSuggestions`, `suggestions`, `autoApply`, `onApplySuggestion`)
- Renders `ChatSuggestions` in composer when chat is empty (line 189)

```tsx
<ChatSuggestionProvider
  autoApply={autoApply}
  initialSuggestions={initialSuggestions}
  onApply={onApplySuggestion}
  suggestions={suggestions}
>
  {/* Chat content */}
  <ChatComposer>
    {messages.length === 0 && <ChatSuggestions mode="default" />}
    <ChatInput />
  </ChatComposer>
</ChatSuggestionProvider>
```

#### ChatComposer Integration

**Location:** `components/chat/composer.tsx:188-189`

The `ChatInput` component supports a `header` prop that renders content before the textarea. This is used to display suggestions when the chat is empty.

### Runtime Integration

The suggestion system integrates with the chat runtime through:

- `useChatRuntime()` - Access to chat functionality for `autoApply="message"`
- `usePromptInputController()` - Access to input controller for `autoApply="input"`

### TypeScript Interfaces

```typescript
export type ChatSuggestionAutoApply = "input" | "message" | "none";

export type ChatSuggestionContext = {
  suggestions: string[];
  onApply: (suggestion: string) => void;
  hasProvider: boolean;
  autoApply: ChatSuggestionAutoApply;
};

export type ChatSuggestionProviderProps = {
  initialSuggestions?: string[];
  suggestions?: string[];
  autoApply?: ChatSuggestionAutoApply;
  onApply?: (suggestion: string) => void;
  children: ReactNode;
};

export type ChatSuggestionsProps = {
  suggestions?: string[];
  onApply?: (suggestion: string) => void;
  mode?: "default" | "minimal";
  className?: string;
  animate?: boolean;
};
```

## Usage Patterns

### 1. Provider with Context

```tsx
<ChatProvider>
  <ChatSuggestionProvider
    initialSuggestions={["What is Next.js?", "Help me write code"]}
    autoApply="input"
  >
    <ChatSuggestions />
  </ChatSuggestionProvider>
</ChatProvider>
```

### 2. Props-Only Usage

```tsx
<ChatProvider>
  <ChatSuggestions
    suggestions={["Custom suggestions"]}
    onApply={(suggestion) => console.log("Selected:", suggestion)}
    mode="minimal"
  />
</ChatProvider>
```

### 3. Hybrid Mode (Provider + Props Override)

```tsx
<ChatSuggestionProvider suggestions={["A", "B", "C"]}>
  <ChatSuggestions
    suggestions={["Override 1", "Override 2"]} // Ignores context
    onApply={() => {}} // Ignores context onApply
  />
</ChatSuggestionProvider>
```

## Migration from usePromptSuggestions

The old `usePromptSuggestions` hook has been removed. The new provider pattern offers:

- **Better separation of concerns** - Suggestion data management separate from UI rendering
- **Increased flexibility** - Component works with or without global context
- **Improved testability** - Easier to unit test with controlled props
- **AI Elements alignment** - Follows established chat primitive patterns
- **Future extensibility** - Easy to add features like suggestion categories

## Performance Considerations

- Provider context value is memoized to prevent unnecessary re-renders
- Suggestion arrays are shallow compared for changes
- Component renders only when suggestions actually change
- Framer Motion animations are optimized with staggered delays

## Accessibility Features

- Suggestion buttons maintain proper ARIA attributes
- Keyboard navigation support in both layout modes
- Screen reader compatibility maintained through existing `Suggestion` element
- Focus management for `autoApply="input"` mode

## Error Handling

- Graceful fallback when provider data is invalid
- Console warnings for malformed suggestions
- Default empty state for edge cases
- No-op behavior when no suggestions provided
- Try-catch blocks around runtime operations

## Future Extensibility

The architecture supports easy addition of:

1. **Suggestion Categories** - Group suggestions by topic
2. **Analytics Integration** - Track suggestion usage
3. **AI-Powered Suggestions** - Dynamic suggestions based on chat context
4. **Custom Renderers** - Allow custom suggestion button components
5. **Suggestion History** - Recently used suggestions

Extension points include:
- Provider context can be extended with additional metadata
- Component supports custom suggestion rendering via render props
- Hook can provide additional utility functions for suggestion management

## Dependencies

- **React** - Context API, hooks, and component architecture
- **Framer Motion** - Animation library for suggestion transitions
- **AI Elements** - Uses existing `Suggestion` and `Suggestions` components
- **Chat Runtime** - Integration with `useChatRuntime()` and `usePromptInputController()`

## Validation

The implementation meets all success criteria:

✅ Provider pattern works with optional context and proper nesting
✅ Component renders with props-only usage (returns null when no suggestions)
✅ Both grid and slider layouts functional and responsive
✅ Auto-apply behavior works for both input population and message sending
✅ Clean integration with existing chat composer and runtime
✅ Maintains accessibility and responsive design patterns
✅ Old hook properly removed with no remaining usage
✅ TypeScript interfaces complete and type-safe
✅ No console errors or warnings in development
✅ Build passes without issues