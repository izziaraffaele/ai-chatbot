# Design: Composable Chat Primitives Architecture

## Overview
This document captures the architectural decisions and patterns introduced by the composable chat primitives refactor. The new architecture replaces monolithic chat components with focused, reusable primitives based on AI Elements framework patterns.

## Architectural Principles

### 1. Composability Over Monoliths
**Pattern**: Break down large components into small, focused primitives that compose together.

**Old Pattern** (Monolithic):
```typescript
// components/assistant-chat.tsx - 500+ lines, does everything
<AssistantChat
  chatId={id}
  initialMessages={messages}
  initialUsage={usage}
  // ... many props
/>
```

**New Pattern** (Composable):
```typescript
// Compose from primitives - each does one thing well
<ChatProvider id={chatId}>
  <AssistantChat>
    <ChatThread>
      <ChatThreadHeader>...</ChatThreadHeader>
      <ChatThreadContent>
        <MessageIterator>...</MessageIterator>
      </ChatThreadContent>
      <ChatComposer>
        <ChatInput tools={...} actions={...} />
      </ChatComposer>
    </ChatThread>
  </AssistantChat>
</ChatProvider>
```

**Rationale**:
- Easier to test individual pieces
- Better code reuse across different chat UIs
- More granular re-renders (performance)
- Easier to customize specific parts without touching others

### 2. Centralized Logic in Hooks
**Pattern**: Extract component logic into reusable hooks.

**Implementation**:
```typescript
// components/chat/composer.tsx
export function useChatComposer() {
  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });
  const composer = usePromptInputController();
  const { files } = useProviderAttachments();

  // All composer logic centralized here
  const handleSubmit = useCallback((message) => {
    // ...
  }, []);

  return { chatId, status, composer, handleSubmit, ... };
}
```

**Rationale**:
- Logic can be used without UI (testing, other components)
- Single source of truth for behavior
- Easier to refactor and maintain
- Follows React best practices

### 3. Namespace Pattern for Related Components
**Pattern**: Group related components under namespace objects instead of individual exports.

**Implementation**:
```typescript
// components/chat/composer.tsx

// Instead of many individual exports:
// export { AttachmentMenu, AgentSelector, ContextUsage }

// Use namespace pattern:
export const ChatComposerTool = {
  AttachmentMenu: ChatComposerToolAttachmentMenu,
  AgentSelector: ChatComposerToolAgentSelector,
  ContextUsage: ChatContextUsage,
};

export const ChatComposerAction = {
  Submit: PromptInputSubmit,
  Speech: ComposerInputSpeechButton,
};
```

**Usage**:
```typescript
<ChatInput
  tools={<>
    <ChatComposerTool.AttachmentMenu />
    <ChatComposerTool.AgentSelector />
    <ChatComposerTool.ContextUsage />
  </>}
  actions={<ChatComposerAction.Submit />}
/>
```

**Rationale**:
- Clear organization (tools vs actions)
- Prevents naming collisions
- Better autocomplete in IDEs
- Similar to React.* pattern (React.useState, React.useEffect)
- No barrel exports needed (anti-pattern)

### 4. Subscription-Based Streaming
**Pattern**: Generic pub/sub system for streaming data with filtered subscriptions.

**Old Pattern** (Artifact-specific):
```typescript
// DataStreamHandler hardcoded for artifacts
function DataStreamHandler() {
  // Tightly coupled to artifact logic
  if (delta.type === 'data-title') {
    setArtifact(...)
  }
}
```

**New Pattern** (Generic + Subscribable):
```typescript
// Generic infrastructure
<DataStreamProvider>
  <DataStreamDispatcher />
  {/* Any component can subscribe */}
</DataStreamProvider>

// Feature-specific subscription
function useArtifactStreaming() {
  useDataStreamSubscription(
    (part) => part.type.startsWith('data-'),
    (part) => {
      // Handle artifact-specific logic
    }
  );
}
```

**Rationale**:
- Infrastructure agnostic to features
- Multiple features can subscribe to same stream
- Easy to add new streaming features
- Better separation of concerns
- Follows observer pattern

### 5. Render Props for Flexibility
**Pattern**: Use render props for conditional rendering and customization.

**Implementation**:
```typescript
<ChatInput
  actions={({ status, hasInput }) => (
    <>
      {hasInput ? (
        <ChatComposerAction.Submit status={status} />
      ) : (
        <ChatComposerAction.Speech />
      )}
    </>
  )}
/>
```

**Rationale**:
- Maximum flexibility without prop explosion
- Dynamic behavior based on state
- Clear what state is available for decision-making
- Follows headless UI pattern

### 6. Side Effects as Components
**Pattern**: Encapsulate side effects in dedicated components.

**Implementation**:
```typescript
// components/chat/effects.tsx
export function ChatAutoResume({ initialMessages, enabled = true }) {
  const { chat } = useChatRuntime();

  useEffect(() => {
    if (enabled && initialMessages.at(-1)?.role === 'user') {
      chat.resumeStream();
    }
  }, [enabled, initialMessages, chat.id]);

  return null;
}

// Usage
<ChatProvider>
  <AssistantChat />
  <ChatAutoResume initialMessages={messages} />
  <ChatRouteParamsHandler />
</ChatProvider>
```

**Rationale**:
- Clear separation of effects from UI
- Easy to enable/disable behaviors
- Self-documenting (component name describes what it does)
- Testable in isolation

### 7. Canvas-Based Artifact View
**Pattern**: Full-screen overlay with split view (thread sidebar + main panel).

**Implementation**:
```typescript
<ChatCanvas isVisible={artifact.isVisible}>
  <ChatCanvasThread>
    {/* Message thread sidebar */}
  </ChatCanvasThread>
  <ChatCanvasMain boundingBox={artifact.boundingBox}>
    {/* Artifact content */}
  </ChatCanvasMain>
</ChatCanvas>
```

**Rationale**:
- Clean separation of chat and artifact views
- Smooth animations with boundingBox
- Thread remains accessible while viewing artifact
- Responsive layout (mobile vs desktop)

## Component Hierarchy

### Chat Primitives Structure
```
components/
├── chat/                          # All chat primitives
│   ├── composer.tsx               # Input area (ChatComposer, ChatInput, tools, actions)
│   ├── thread.tsx                 # Message display (ChatThread, Header, Content)
│   ├── canvas.tsx                 # Split view layout (Canvas, Thread, Main)
│   ├── artifact.tsx               # Artifact display (Draft, Version, Header, Body, Footer)
│   ├── streaming.tsx              # Stream infrastructure (Provider, Dispatcher, hooks)
│   ├── effects.tsx                # Side effects (AutoResume, RouteParams)
│   ├── iterators.tsx              # Message iteration (MessageIterator)
│   ├── message.tsx                # Message rendering primitives
│   ├── message-parts.tsx          # Individual message part renderers
│   ├── usage.tsx                  # Context usage display
│   └── agent-selector.tsx         # Agent selection UI
├── messages/                      # Message type components
│   ├── assistant-message.tsx     # Assistant message with tools, votes
│   ├── user-message.tsx          # User message with attachments
│   └── system-message.tsx        # System/error messages
├── artifacts/                     # Artifact implementations
│   └── document.tsx              # Document artifact (text, code, sheet)
├── tools/                         # Tool UI components (after rename)
│   ├── weather.tsx
│   ├── create-document.tsx
│   ├── update-document.tsx
│   └── request-suggestions.tsx
└── assistant-chat.tsx             # Full composition (after rename)
```

### Context Hierarchy
```
<ChatProvider>                     # Provides chat runtime
  <DataStreamProvider>             # Provides streaming context
    <ChatThread>                   # Main chat view
      <MessageIterator>            # Iterates messages
        <AssistantMessage>         # Individual message
        <UserMessage>
    <ChatComposer>                 # Input area
      <ChatInput>                  # Uses PromptInputController

    <ChatCanvas>                   # Artifact overlay
      <ChatCanvasThread>           # Sidebar with messages
      <ChatCanvasMain>             # Artifact display
        <ArtifactVersionProvider>  # Provides versioning
          <ArtifactDraftProvider>  # Provides draft state
            <DocumentArtifact>

    <DataStreamDispatcher />       # Dispatches to subscribers
    <ChatAutoResume />             # Auto-resume effect
    <ChatRouteParamsHandler />     # Query param effect
</ChatProvider>
```

## Key Decisions and Trade-offs

### Decision 1: Provider Pattern vs Prop Drilling
**Decision**: Use Context providers for cross-cutting concerns.

**Trade-offs**:
- ✅ Avoids prop drilling through many layers
- ✅ Components can access what they need directly
- ⚠️ Can make component dependencies less obvious
- ⚠️ Must be inside provider to work

**Mitigation**: Clear error messages when used outside provider, documented in JSDoc.

### Decision 2: Editable Documents vs View-Only Artifacts
**Decision**: Treat artifacts as two distinct categories based on editability.

**Architecture**:
1. **Document Artifacts** (Editable):
   - Types: `text`, `code`, `sheet`
   - Features: Versioning + DraftProvider + Auto-save
   - UI: Full editing capabilities with real-time collaboration
   - Example: `<DocumentArtifact kind="text">`

2. **Media Artifacts** (View-only):
   - Types: `image`, future media types
   - Features: Versioning only (no DraftProvider)
   - UI: Display-only with metadata and actions
   - Example: `<ImageArtifact>`

**Rationale**:
- ✅ Clear separation of concerns between editable and view-only content
- ✅ Optimizes UI by not loading heavy editing features for view-only content
- ✅ Simplifies type system and component architecture
- ✅ Allows different interaction patterns per artifact category

**Implementation**:
```typescript
// Editable documents get full editor features
<DocumentArtifact kind="text" documentId="..." />
<DocumentArtifact kind="code" documentId="..." />
<DocumentArtifact kind="sheet" documentId="..." />

// View-only artifacts get simpler display features
<ImageArtifact imageId="..." /> // No DraftProvider
```

### Decision 2: Namespace Exports vs Individual Exports
**Decision**: Use namespace objects for related components.

**Trade-offs**:
- ✅ Clear organization and grouping
- ✅ Better IDE autocomplete
- ✅ Prevents naming collisions
- ⚠️ Slightly more verbose imports
- ⚠️ Less tree-shakeable (though all components typically used together)

**Mitigation**: Keep namespaces focused (ChatComposerTool vs ChatComposerAction).

### Decision 3: Generic Streaming vs Feature-Specific
**Decision**: Build generic infrastructure with feature-specific subscriptions.

**Trade-offs**:
- ✅ Highly reusable and extensible
- ✅ Easy to add new streaming features
- ✅ Clean separation of concerns
- ⚠️ More complex than hardcoded solution
- ⚠️ Requires understanding of pub/sub pattern

**Mitigation**: Comprehensive JSDoc and examples, helper hooks for common patterns.

### Decision 4: Render Props vs Compound Components
**Decision**: Use render props for dynamic content, compound components for structure.

**Trade-offs**:
- ✅ Maximum flexibility for conditional rendering
- ✅ Clear what state is available
- ⚠️ Can be verbose for simple cases
- ⚠️ Requires function definition (not just JSX)

**Mitigation**: Provide both static node and render function options where appropriate.

### Decision 5: AI Elements vs Custom UI
**Decision**: Leverage AI Elements components (PromptInput, ModelSelector) where possible.

**Trade-offs**:
- ✅ Consistent with AI SDK ecosystem
- ✅ Well-tested, accessible components
- ✅ Less code to maintain
- ⚠️ Dependency on external library
- ⚠️ Limited customization in some areas

**Mitigation**: Wrap AI Elements components in our own primitives for additional customization.

## Migration Strategy

### Phase 1: Build New Alongside Old ✅ COMPLETE
- Created new primitives in `components/chat/*`
- Created new messages in `components/messages/*`
- Created new tools in `components/tools-new/*`
- Created new AssistantChat in `components/assistant-chat-new.tsx`

### Phase 2: Verify Feature Parity 🔄 IN PROGRESS
- Code-level review of all features
- Fix minor design issues
- Ensure all functionality preserved

### Phase 3: Remove Old Implementation
- Delete old components
- Rename `-new` files
- Update all imports
- Clean up unused code

### Phase 4: Document and Specify
- Add comprehensive JSDoc
- Create chat-primitives spec
- Update project.md

## Performance Considerations

### Granular Re-renders
**Benefit**: Smaller components re-render only when their specific data changes.

**Example**:
- Old: Entire AssistantChat re-renders on any state change
- New: Only MessageIterator re-renders when messages change, Composer stays static

### Memoization Opportunities
**Benefit**: Primitives can be memoized independently.

**Implementation**:
```typescript
export const AssistantMessage = memo(PureAssistantMessage);
export const UserMessage = memo(PureUserMessage);
```

### Subscription-Based Updates
**Benefit**: Only subscribed components react to stream updates.

**Example**:
- Old: All components in tree potentially re-render on stream event
- New: Only components subscribed to specific stream parts update

## Testing Strategy (Future Work)

### Unit Testing
- Test hooks in isolation (useChatComposer, useDataStreamSubscription)
- Test primitives with minimal dependencies
- Mock contexts for component tests

### Integration Testing
- Test compositions (AssistantChat with all primitives)
- Test provider interactions
- Test subscription patterns

### E2E Testing (Deferred)
- Full user flows with new implementation
- Regression testing against old implementation
- Performance benchmarking

## Open Questions
None - architecture is well-defined and implemented.

## References
- [AI SDK Elements Documentation](https://ai-sdk.dev/elements)
- [React Composition Patterns](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [Headless UI Patterns](https://www.radix-ui.com/primitives/docs/overview/introduction)
