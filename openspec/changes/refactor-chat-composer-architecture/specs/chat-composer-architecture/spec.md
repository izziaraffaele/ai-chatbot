# chat-composer-architecture Specification

## Purpose
Refactor the chat composer architecture to eliminate duplication between `useChatComposer` and `usePromptInputController` while supporting multiple prompt inputs with proper textarea ref sharing.

## ADDED Requirements

### Requirement: ChatComposerProvider Component
The system SHALL provide a `ChatComposerProvider` component that manages composer-specific state including textareaRef sharing.

#### Scenario: Multiple composer instances with independent textareaRefs
```typescript
<ChatProvider>
  <ChatComposerProvider>
    <ChatComposer>....</ChatComposer>  {/* Main chat */}
  </ChatComposerProvider>

  <ChatComposerProvider>
    <ChatComposer>....</ChatComposer>  {/* Canvas */}
  </ChatComposerProvider>
</ChatProvider>
```
Given a chat interface needs multiple prompt inputs
When ChatComposerProvider is used multiple times
Then each instance has its own textareaRef
And composers don't interfere with each other
And all composers share global input state through ChatProvider

### Requirement: useChatContext Hook
The system SHALL provide a `useChatContext()` hook that provides access to global chat state including input text, attachments, and chat functions.

#### Scenario: Access global input state from any component
```typescript
function MyComponent() {
  const { inputValue, setInput, attachments, sendMessage } = useChatContext();

  return (
    <button onClick={() => sendMessage({ text: inputValue, files: attachments })}>
      Send Message
    </button>
  );
}
```
Given a component needs access to chat state
When `useChatContext()` is called
Then it returns global input value and setter
And returns attachments array and attachment functions
And returns chat functions (sendMessage, stop, etc.)
And returns chat status and chatId

#### Scenario: Global input persistence
```typescript
function GlobalInputDisplay() {
  const { inputValue } = useChatContext();
  return <div>Current input: {inputValue}</div>;
}
```
Given input text changes in any composer
When `useChatContext()` is called
Then it returns the current global input value
And input persists to localStorage automatically
And changes are reflected across all components

### Requirement: useChatComposerContext Hook
The system SHALL provide a `useChatComposerContext()` hook that provides composer-specific state including textareaRef and form handling.

#### Scenario: Access textarea ref within composer scope
```typescript
function SpeechButton() {
  const { registerTextarea } = useChatComposerContext();
  const [textareaRef, setTextareaRef] = useState(null);

  useEffect(() => {
    return registerTextarea(setTextareaRef);
  }, [registerTextarea]);

  return <PromptInputSpeechButton textareaRef={textareaRef} />;
}
```
Given a component needs access to textarea within a composer
When `useChatComposerContext()` is called
Then it returns registerTextarea function
And registerTextarea provides the correct textareaRef for that composer
And cleanup function handles unmount properly

#### Scenario: Form submission with composer context
```typescript
function CustomForm() {
  const { handleSubmit } = useChatComposerContext();

  const onSubmit = (e) => {
    handleSubmit({ text: "Hello", files: [] }, e);
  };

  return <form onSubmit={onSubmit}>...</form>;
}
```
Given a component needs to submit a form within a composer
When `useChatComposerContext()` is called
Then it returns handleSubmit function
And handleSubmit integrates with global chat state
And form submission works the same as original useChatComposer

### Requirement: Textarea Registration Pattern
The ChatComposerProvider SHALL provide a registration mechanism for components to access the shared textarea ref.

#### Scenario: Multiple components register for textarea access
```typescript
function ComposerWithMultipleTools() {
  return (
    <ChatComposerProvider>
      <ChatInput />
      <SpeechButton />        {/* Registers for textarea ref */}
      <AutoCompleteButton />  {/* Registers for textarea ref */}
      <EmojiPicker />         {/* Registers for textarea ref */}
    </ChatComposerProvider>
  );
}
```
Given multiple components need textarea access
When components call registerTextarea
Then all registered components receive the same textareaRef
And registration/unregistration handles component lifecycle
And memory leaks are prevented through proper cleanup

#### Scenario: Textarea ref updates
```typescript
function ToolThatNeedsTextarea() {
  const { registerTextarea } = useChatComposerContext();
  const [textareaRef, setTextareaRef] = useState(null);

  useEffect(() => {
    const unregister = registerTextarea(setTextareaRef);
    return unregister;
  }, [registerTextarea]);

  // textareaRef updates when ChatInput's textarea changes
  useEffect(() => {
    if (textareaRef?.current) {
      console.log('Textarea available:', textareaRef.current);
    }
  }, [textareaRef]);
}
```
Given textarea ref changes (e.g., component re-render)
When registerTextarea callback is called
Then registered components receive updated ref
And components can respond to ref changes
And registration remains stable across re-renders

## MODIFIED Requirements

### Requirement: Centralized Composer Logic Hook
The `useChatComposer` hook SHALL be removed and replaced with separate `useChatContext()` and `useChatComposerContext()` hooks to eliminate duplication.

#### Scenario: Migrate from useChatComposer to new hooks
```typescript
// Before (removed)
function MyComponent() {
  const { chatId, status, inputValue, textareaRef, handleSubmit } = useChatComposer();
}

// After (new pattern)
function MyComponent() {
  const { inputValue, sendMessage, status } = useChatContext();        // Global state
  const { textareaRef, handleSubmit } = useChatComposerContext();      // Composer state
}
```
Given existing code uses `useChatComposer()`
When migrating to new architecture
Then global state access moves to `useChatContext()`
And composer-specific access moves to `useChatComposerContext()`
And functionality is preserved without duplication

### Requirement: Chat Input Component
The ChatInput component SHALL be updated to use the new context hooks instead of `useChatComposer()`.

#### Scenario: ChatInput uses new context pattern
```typescript
export function ChatInput({ placeholder, tools, actions }) {
  const { inputValue, setInput } = useChatContext();                    // Global input
  const { textareaRef, handleSubmit, status } = useChatComposerContext(); // Composer state

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea ref={textareaRef} value={inputValue} onChange={e => setInput(e.target.value)} />
    </PromptInput>
  );
}
```
Given ChatInput component needs composer functionality
When using the new architecture
Then it uses `useChatContext()` for input state
And uses `useChatComposerContext()` for textarea and form handling
And all existing props and render patterns continue to work

### Requirement: Composer Actions Namespace
The ChatComposerAction namespace SHALL be updated to use the new context hooks for proper textarea ref sharing.

#### Scenario: Speech action with proper textarea access
```typescript
const ComposerInputSpeechButton = () => {
  const { registerTextarea } = useChatComposerContext();
  const [textareaRef, setTextareaRef] = useState(null);

  useEffect(() => {
    return registerTextarea(setTextareaRef);
  }, [registerTextarea]);

  return <PromptInputSpeechButton textareaRef={textareaRef} />;
};

export const ChatComposerAction = {
  Speech: ComposerInputSpeechButton,
  Submit: PromptInputSubmit,
};
```
Given speech button needs textarea access
When using the new architecture
Then it registers for textarea ref through `useChatComposerContext()`
And receives the correct textarea for its composer instance
And speech transcription works properly

## REMOVED Requirements

### Requirement: useChatComposer Hook
The `useChatComposer` hook SHALL be removed to eliminate duplication with existing context hooks.

#### Scenario: Hook removal eliminates duplication
```typescript
// This hook will be removed:
export function useChatComposer() {
  const controller = usePromptInputController(); // ❌ Duplication
  const textareaRef = useRef<HTMLTextAreaElement>(null); // ❌ New ref every time
  // ... duplicated functionality
}
```
Given `useChatComposer` hook creates duplicate functionality
When the hook is removed
Then components use direct context access instead
And textarea ref sharing works properly
And duplication is eliminated

## General Requirements

### Requirement: Backward Compatibility
The refactored architecture SHALL maintain backward compatibility with existing component APIs and usage patterns.

#### Scenario: Existing ChatInput usage continues to work
```typescript
// This should continue to work without changes
<ChatInput
  placeholder="Send a message..."
  tools={<ChatComposerTool.AttachmentMenu />}
  actions={({ status, hasInput }) => (
    hasInput ? <ChatComposerAction.Submit /> : <ChatComposerAction.Speech />
  )}
/>
```
Given existing ChatInput component usage
When using the refactored architecture
Then all existing props continue to work
And render prop patterns are maintained
And component behavior remains unchanged

#### Scenario: Existing ChatProvider usage continues to work
```typescript
// This should continue to work without changes
<ChatProvider initialInput="Hello">
  <ChatInput />
</ChatProvider>
```
Given existing ChatProvider usage
When using the refactored architecture
Then all existing props are preserved
And localStorage persistence continues to work
And form submission behavior is unchanged

### Requirement: Namespace Organization
The refactored architecture SHALL maintain existing namespace organization for tools and actions.

#### Scenario: ChatComposerTool namespace preserved
```typescript
import { ChatComposerTool } from '@/components/chat/composer';

<ChatComposerTool.AttachmentMenu />
<ChatComposerTool.AgentSelector />
<ChatComposerTool.ContextUsage />
```
Given existing namespace imports
When using the refactored architecture
Then all ChatComposerTool.* components are available
And component APIs remain unchanged
And TypeScript types are preserved

#### Scenario: ChatComposerAction namespace preserved
```typescript
import { ChatComposerAction } from '@/components/chat/composer';

<ChatComposerAction.Submit />
<ChatComposerAction.Speech />
```
Given existing action namespace imports
When using the refactored architecture
Then all ChatComposerAction.* components are available
And action behaviors remain unchanged
And integration with new contexts works correctly

### Requirement: Error Handling
The refactored architecture SHALL provide proper error handling for context usage outside providers.

#### Scenario: Hook used outside ChatProvider
```typescript
function InvalidUsage() {
  const { inputValue } = useChatContext(); // Should throw error
  return <div>{inputValue}</div>;
}
```
Given `useChatContext()` is called outside ChatProvider
When the component renders
Then it throws a descriptive error message
And error mentions wrapping component in ChatProvider
And error is catchable in error boundaries

#### Scenario: Hook used outside ChatComposerProvider
```typescript
function InvalidComposerUsage() {
  const { textareaRef } = useChatComposerContext(); // Should throw error
  return <div>Ref: {textareaRef}</div>;
}
```
Given `useChatComposerContext()` is called outside ChatComposerProvider
When the component renders
Then it throws a descriptive error message
And error mentions wrapping component in ChatComposerProvider
And error provides guidance on correct usage

### Requirement: Performance Optimization
The refactored architecture SHALL prevent unnecessary re-renders and optimize context value creation.

#### Scenario: Context values are memoized
```typescript
// Provider implementation should prevent unnecessary re-renders
const contextValue = useMemo(() => ({
  textareaRef,
  handleSubmit,
  registerTextarea,
  status,
}), [textareaRef, handleSubmit, registerTextarea, status]);
```
Given context provider renders
When context value dependencies haven't changed
Then context value reference remains stable
And child components don't re-render unnecessarily
And performance is maintained

#### Scenario: Registration cleanup
```typescript
useEffect(() => {
  const unregister = registerTextarea(setTextareaRef);
  return unregister; // Cleanup on unmount
}, [registerTextarea]);
```
Given component registers for textarea access
When component unmounts
Then registration is properly cleaned up
And memory leaks are prevented
And other components continue to work correctly