# Chat Suggestions Specification

## ADDED Requirements

### Requirement: Chat Suggestion Provider
The system SHALL provide a context provider that manages suggestion state and auto-apply behavior within the ChatProvider context.

#### Scenario: Provider with auto-apply input mode
```tsx
<ChatProvider>
  <ChatSuggestionProvider
    initialSuggestions={["What is Next.js?", "Help me write code"]}
    suggestions={["Dynamic suggestion"]}
    autoApply="input"
  >
    <ChatSuggestions />
  </ChatSuggestionProvider>
</ChatProvider>
```
**Expected**: Suggestions are displayed and clicking them populates the prompt input with the suggestion text.

#### Scenario: Provider with auto-apply message mode
```tsx
<ChatProvider>
  <ChatSuggestionProvider
    suggestions={["Send this as message"]}
    autoApply="message"
  >
    <ChatSuggestions />
  </ChatSuggestionProvider>
</ChatProvider>
```
**Expected**: Clicking suggestions immediately sends them as new chat messages.

#### Scenario: Provider with custom onApply handler
```tsx
<ChatProvider>
  <ChatSuggestionProvider
    suggestions={["Custom handling"]}
    autoApply="none"
    onApply={(suggestion) => console.log("Custom:", suggestion)}
  >
    <ChatSuggestions />
  </ChatSuggestionProvider>
</ChatProvider>
```
**Expected**: Clicking suggestions triggers the custom `onApply` handler.

### Requirement: Chat Suggestions Component
The system SHALL provide a flexible component that renders suggestions using different layout modes and works with or without provider context.

#### Scenario: Component using provider context
```tsx
<ChatProvider>
  <ChatSuggestionProvider suggestions={["From context"]}>
    <ChatSuggestions mode="default" />
  </ChatSuggestionProvider>
</ChatProvider>
```
**Expected**: Renders suggestions from provider context in default grid layout.

#### Scenario: Component with props override
```tsx
<ChatProvider>
  <ChatSuggestionProvider suggestions={["From context"]}>
    <ChatSuggestions
      suggestions={["From props"]}
      mode="minimal"
    />
  </ChatSuggestionProvider>
</ChatProvider>
```
**Expected**: Renders suggestions from props (ignoring context) in minimal slider layout.

#### Scenario: Component without provider
```tsx
<ChatProvider>
  <ChatSuggestions
    suggestions={["Props only"]}
    onApply={(suggestion) => {}}
  />
</ChatProvider>
```
**Expected**: Renders suggestions from props since no provider context exists.

#### Scenario: Component with no suggestions
```tsx
<ChatProvider>
  <ChatSuggestions />
</ChatProvider>
```
**Expected**: Component renders nothing (null) when no suggestions available.

### Requirement: Chat Suggestions Hook
The system SHALL provide a hook that accesses suggestion context and provides utility functions for suggestion management.

#### Scenario: Hook with provider context
```tsx
const ChatComponent = () => {
  const suggestions = useChatSuggestions();
  // suggestions: { suggestions: string[], onApply: Function, hasProvider: true }
};
```
**Expected**: Hook returns context data when provider exists.

#### Scenario: Hook without provider context
```tsx
const ChatComponent = () => {
  const suggestions = useChatSuggestions();
  // suggestions: { hasProvider: false }
};
```
**Expected**: Hook returns minimal state when no provider exists.

### Requirement: Default Layout Mode
The system SHALL provide a responsive 2-column grid layout that adapts to screen size.

#### Scenario: Default grid layout on desktop
```tsx
<ChatSuggestions suggestions={["A", "B", "C", "D"]} mode="default" />
```
**Expected**: 2-column grid layout on desktop screens.

#### Scenario: Default grid layout on mobile
```tsx
<ChatSuggestions suggestions={["A", "B", "C", "D"]} mode="default" />
```
**Expected**: Single column layout on mobile screens for better usability.

### Requirement: Minimal Layout Mode
The system SHALL provide a horizontal scrolling slider layout using existing Suggestions elements.

#### Scenario: Minimal slider layout
```tsx
<ChatSuggestions suggestions={["Long suggestion 1", "Long suggestion 2"]} mode="minimal" />
```
**Expected**: Horizontal scrolling container with suggestion buttons.

### Requirement: Runtime Integration
The provider SHALL integrate with chat runtime and prompt input controller for auto-apply functionality.

#### Scenario: Auto-apply to prompt input
```tsx
// Provider autoApply="input" (default)
<ChatSuggestions suggestions={["Set this in input"]} />
// Click suggestion -> Input field gets populated with "Set this in input"
```
**Expected**: Suggestion text is set in the prompt input field and input receives focus.

#### Scenario: Auto-apply as message
```tsx
// Provider autoApply="message"
<ChatSuggestions suggestions={["Send immediately"]} />
// Click suggestion -> New message sent with "Send immediately"
```
**Expected**: New chat message is sent immediately with the suggestion text.

### Requirement: Chat Composer Integration
The system SHALL display suggestions in the chat composer when the chat thread is empty.

#### Scenario: Empty chat with suggestions
```tsx
<ChatComposer>
  <ChatInput
    header={<ChatSuggestions suggestions={["Start here"]} />}
    // ... other props
  />
</ChatComposer>
```
**Expected**: Suggestions appear above the input when chat is empty.

#### Scenario: Chat with messages
```tsx
// Chat has existing messages
<ChatComposer>
  <ChatInput
    header={<ChatSuggestions suggestions={["Don't show"]} />}
    // ... other props
  />
</ChatComposer>
```
**Expected**: Suggestions are hidden when chat has messages (implementation logic in composer).

## MODIFIED Requirements

### Requirement: Chat Composer Header
The ChatInput component SHALL support header prop for custom content above the textarea.

#### Scenario: Header with suggestions
```tsx
<ChatInput
  header={<ChatSuggestions suggestions={["Header content"]} />}
  placeholder="Send a message..."
/>
```
**Expected**: Suggestions are rendered above the textarea input field.

## REMOVED Requirements

### Requirement: usePromptSuggestions Hook
The system SHALL remove the old hook for managing prompt suggestions in favor of the new provider pattern.

#### Scenario: Migration from old hook
```tsx
// Old way (removed)
const { suggestions } = usePromptSuggestions();

// New way
<ChatSuggestionProvider suggestions={suggestions}>
  <ChatSuggestions />
</ChatSuggestionProvider>
```
**Expected**: New provider pattern replaces the old hook-based approach.