# Refactor Chat Composer Architecture

## Problem Statement

The current chat composer architecture has significant duplication and design issues:

1. **Duplicated Functionality**: `useChatComposer` hook internally calls `usePromptInputController()`, creating redundant functionality and two separate sources of truth for the same state
2. **textareaRef Recreation**: Each call to `useChatComposer` creates a new `textareaRef`, preventing proper sharing between components that need access to the same textarea (like speech recognition)
3. **Over-engineered Architecture**: Multiple contexts and layers doing similar things, making the codebase harder to understand and maintain
4. **Scattered State Management**: Input and attachment state exists in multiple places with unclear ownership

## Current Architecture Issues

### Duplication Problem
```typescript
// Current problematic pattern
export function useChatComposer() {
  const controller = usePromptInputController(); // ❌ Duplication
  const textareaRef = useRef<HTMLTextAreaElement>(null); // ❌ New ref every time
  // ... other logic that duplicates prompt controller functionality
}
```

### textareaRef Sharing Problem
```typescript
// Speech button can't access the right textarea because ref is recreated
const ComposerInputSpeechButton = () => {
  const { textareaRef } = useChatComposer(); // ❌ New ref, not the actual textarea
  return <PromptInputSpeechButton textareaRef={textareaRef} />;
};
```

### Multiple Composer Support
A chat UI can render many prompt inputs simultaneously (main chat, canvas, side panels), so a single centralized ref in the ChatProvider is not ideal.

## Proposed Solution

**Two-Level Context Architecture** - Separate global chat state from composer-level state to support multiple composers while eliminating duplication.

### New Architecture Pattern
```typescript
<ChatProvider initialInput="">              // Global chat context (input text, attachments)
  <ChatComposerProvider>                   // Composer-level context (textareaRef, form logic)
    <ChatComposer>....</ChatComposer>      // Main chat composer
  </ChatComposerProvider>

  // In the canvas - separate composer instance
  <ChatComposerProvider>
    <ChatComposer>....</ChatComposer>      // Canvas composer with its own textareaRef
  </ChatComposerProvider>
</ChatProvider>
```

### Context Responsibilities

#### ChatProvider (Global)
- **Input text state** - Global input value that can be accessed/set anywhere
- **Attachments state** - Global file attachments that can be accessed/set anywhere
- **Chat runtime access** - Connection to chat backend
- **Form submission logic** - Centralized message sending
- **localStorage persistence** - Input value persistence

#### ChatComposerProvider (Composer-level)
- **textareaRef management** - Shared ref for all components within this composer
- **Form state** - Ready/streaming/error status for this specific composer
- **Component registration** - Allow components to register and share textarea access
- **Scoped isolation** - Each composer instance has its own textarea and form state

### Key Benefits
- ✅ **Multiple composer support** - Each ChatComposerProvider manages its own textareaRef
- ✅ **Global input state** - Single source of truth for input text/attachments accessible anywhere
- ✅ **Eliminates duplication** - No more redundant useChatComposer calling usePromptInputController
- ✅ **Proper textarea sharing** - Components within the same composer share the same textarea ref
- ✅ **Maintains AI Elements compatibility** - Doesn't modify external library components
- ✅ **Clear separation of concerns** - Global vs composer-level responsibilities

## Implementation Strategy

### Phase 1: Create ChatComposerProvider
- New provider that extends PromptInputController with textareaRef sharing
- Provides registration mechanism for components to access the shared textarea
- Manages composer-specific state (status, form handling)

### Phase 2: Refactor ChatProvider
- Remove duplicated functionality (keep only global input/attachments state)
- Maintain localStorage persistence and form submission logic
- Provide global access to input text and attachments

### Phase 3: Update Component Usage
- Replace `useChatComposer()` with direct context access:
  - Global: `useChatContext()` for input text, attachments, chat functions
  - Composer: `useChatComposerContext()` for textareaRef, form status
- Update ChatInput, ChatComposerTool, and ChatComposerAction components

### Phase 4: Remove Legacy Hook
- Remove the redundant `useChatComposer` hook
- Clean up any remaining usages throughout the codebase

## New Hook APIs

### useChatContext() - Global State
```typescript
function useChatContext() {
  return {
    // Global input state
    inputValue: string,
    setInput: (value: string) => void,
    clearInput: () => void,

    // Global attachments state
    attachments: FileUIPart[],
    addAttachments: (files: File[]) => void,
    removeAttachment: (id: string) => void,
    clearAttachments: () => void,

    // Chat functions
    sendMessage: (message: PromptInputMessage) => void,
    status: ChatStatus,
    chatId: string,
    stop: () => void,
  };
}
```

### useChatComposerContext() - Composer-level State
```typescript
function useChatComposerContext() {
  return {
    // Textarea ref for this composer
    textareaRef: RefObject<HTMLTextAreaElement>,

    // Form handling
    handleSubmit: (message: PromptInputMessage, event: FormEvent) => void,

    // Composer-specific state
    status: ChatStatus,

    // Component registration (for speech button, etc.)
    registerTextarea: (callback: (ref: RefObject<HTMLTextAreaElement>) => void) => void,
  };
}
```

## Backward Compatibility

This change maintains backward compatibility by:
- Keeping the existing `ChatProvider` API unchanged
- All existing component props and functionality preserved
- Only changing internal implementation, not external interfaces
- Components can be migrated incrementally
- Existing prompt input patterns continue to work

## Risk Assessment

**Low Risk** - This refactoring:
- Doesn't modify external AI Elements components
- Maintains all existing functionality
- Follows established React context patterns
- Supports the existing multiple-composer use case
- Can be implemented incrementally with testing at each step