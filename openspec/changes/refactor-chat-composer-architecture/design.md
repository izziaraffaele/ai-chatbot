# Refactor Chat Composer Architecture - Design

## Architecture Overview

This refactor introduces a two-level context architecture to separate global chat state from composer-specific state, eliminating duplication and supporting multiple prompt inputs in the same chat interface.

### Context Hierarchy

```
ChatProvider (Global)
├── Global input text state
├── Global attachments state
├── Chat runtime integration
├── Form submission logic
└── localStorage persistence

ChatComposerProvider (Composer-level)
├── textareaRef management
├── Form state (ready/streaming/error)
├── Component registration for textarea access
└── Scoped composer isolation
```

## Detailed Component Design

### ChatProvider Enhancements

The existing `ChatProvider` will be refactored to focus solely on global state management:

```typescript
export type ChatContextProps = {
  // Global input state (accessible anywhere)
  inputValue: string;
  setInput: (value: string) => void;
  clearInput: () => void;

  // Global attachments state
  attachments: FileUIPart[];
  addAttachments: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // Chat integration
  sendMessage: (message: PromptInputMessage) => void;
  status: ChatStatus;
  chatId: string;
  stop: () => void;
};
```

**Key Changes:**
- Removes duplicate functionality from `useChatComposer`
- Maintains all existing ChatProvider props and behavior
- Integrates with `usePromptInputController` for input/attachments
- Persists input value to localStorage
- Handles form submission logic

### ChatComposerProvider (New)

New provider that manages composer-specific state and textarea sharing:

```typescript
export type ChatComposerContextProps = {
  // Textarea ref for this specific composer
  textareaRef: RefObject<HTMLTextAreaElement | null>;

  // Form handling for this composer
  handleSubmit: (message: PromptInputMessage, event: FormEvent) => void;

  // Component registration for textarea access
  registerTextarea: (callback: (ref: RefObject<HTMLTextAreaElement | null>) => void) => () => void;

  // Composer-specific status
  status: ChatStatus;
};
```

**Key Features:**
- Wraps `PromptInputProvider` to add textarea ref sharing
- Each instance manages its own textareaRef
- Provides registration mechanism for components needing textarea access
- Integrates with global ChatProvider for form submission

### Component Registration Pattern

To solve the textarea sharing problem:

```typescript
// Components that need textarea access register themselves
const SpeechButton = () => {
  const { registerTextarea } = useChatComposerContext();
  const [textareaRef, setTextareaRef] = useState(null);

  useEffect(() => {
    return registerTextarea(setTextareaRef);
  }, [registerTextarea]);

  return <PromptInputSpeechButton textareaRef={textareaRef} />;
};
```

This pattern ensures:
- Components get the correct textarea for their composer
- Multiple composers don't interfere with each other
- Clean unmount behavior prevents memory leaks
- Type-safe access to textarea refs

## Migration Strategy

### Phase 1: Create New Contexts

1. **ChatComposerProvider Component**
   ```typescript
   export function ChatComposerProvider({ children }: { children: React.ReactNode }) {
     const { handleSubmit, status } = useChatContext();
     const textareaRef = useRef<HTMLTextAreaElement>(null);
     const [registeredCallbacks, setRegisteredCallbacks] = useState<Set<Function>>(new Set());

     const registerTextarea = useCallback((callback: Function) => {
       callback(textareaRef);
       setRegisteredCallbacks(prev => new Set(prev).add(callback));
       return () => setRegisteredCallbacks(prev => {
         const newSet = new Set(prev);
         newSet.delete(callback);
         return newSet;
       });
     }, []);

     const contextValue = useMemo(() => ({
       textareaRef,
       handleSubmit,
       registerTextarea,
       status,
     }), [textareaRef, handleSubmit, registerTextarea, status]);

     return (
       <ChatComposerContext.Provider value={contextValue}>
         <PromptInputProvider>
           {children}
         </PromptInputProvider>
       </ChatComposerContext.Provider>
     );
   }
   ```

2. **Refactor useChatContext Hook**
   - Extract global state logic from existing `useChatComposer`
   - Maintain localStorage integration
   - Preserve form submission behavior

### Phase 2: Update Component Usage

#### Before (Current Pattern)
```typescript
const ChatInput = ({ actions, tools }) => {
  const { status, inputValue, textareaRef, handleSubmit } = useChatComposer();
  // Component logic...
};
```

#### After (New Pattern)
```typescript
const ChatInput = ({ actions, tools }) => {
  const { inputValue, setInput } = useChatContext();        // Global state
  const { textareaRef, handleSubmit, status } = useChatComposerContext(); // Composer state

  // Component logic remains the same...
};
```

### Phase 3: Component Updates

#### ChatInput Component
- Split `useChatComposer` usage into `useChatContext` + `useChatComposerContext`
- Maintain all existing props and render prop patterns
- Ensure backward compatibility

#### ChatComposerTool Components
- Update to use new context hooks
- Maintain namespace organization (`ChatComposerTool.*`)
- Ensure tools work with global attachments state

#### ChatComposerAction Components
- Fix speech button textarea access via registration
- Maintain all action behaviors and props
- Ensure proper integration with form submission

## Benefits Analysis

### Eliminated Duplication
- **Before**: `useChatComposer` → `usePromptInputController` (redundant wrapper)
- **After**: Direct access to `useChatContext` and `usePromptInputController`

### Proper textarea Sharing
- **Before**: Each `useChatComposer` call creates new ref
- **After**: Shared ref within composer scope, multiple composers supported

### Clear Separation of Concerns
- **Global concerns**: Input text, attachments, chat state (ChatProvider)
- **Composer concerns**: textarea ref, form handling, component registration (ChatComposerProvider)

### Multiple Composer Support
- **Before**: Single textarea ref in global context (doesn't work for multiple inputs)
- **After**: Each ChatComposerProvider manages its own textareaRef

## Risk Mitigation

### Backward Compatibility
- Maintain all existing component APIs
- Preserve ChatProvider props and behavior
- Components can be migrated incrementally
- No breaking changes to external interfaces

### Performance Considerations
- Context values are memoized to prevent unnecessary re-renders
- Registration pattern prevents memory leaks
- Minimal overhead from new provider layer
- Efficient textarea ref sharing

### Error Handling
- Proper error messages when hooks used outside providers
- Type-safe context access with TypeScript
- Clean unmount behavior prevents stale references
- Graceful fallback for missing registrations

## Implementation Notes

### TypeScript Types
- All new hooks properly typed with return values
- Context interfaces exported for extensibility
- Generic component patterns maintained
- Strict type checking for context usage

### Testing Strategy
- Unit tests for new hooks and providers
- Integration tests for multiple composer scenarios
- E2E tests to verify no regressions
- Performance testing for context overhead

### Code Organization
- New provider logic in `components/chat/composer.tsx`
- Global context updates in `components/chat/context.tsx`
- Clear separation of provider files
- Maintained file organization patterns