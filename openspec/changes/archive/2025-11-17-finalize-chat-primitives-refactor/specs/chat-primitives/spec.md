# Chat Primitives

Composable chat interface primitives built on AI Elements framework for building conversational AI applications.

## ADDED Requirements

### Requirement: Chat Composer Container
The composer SHALL provide a container for chat input with consistent spacing, positioning, and z-index layering.

#### Scenario: Render composer with input
```typescript
<ChatComposer>
  <ChatInput
    placeholder="Send a message..."
    tools={<>
      <ChatComposerTool.AttachmentMenu />
      <ChatComposerTool.AgentSelector />
    </>}
    actions={<ChatComposerAction.Submit />}
  />
</ChatComposer>
```
Given a chat interface
When the composer is rendered
Then it displays input area with consistent spacing
And provides z-index layering for overlays
And has max-width constraint for readability

### Requirement: Centralized Composer Logic Hook
The `useChatComposer` hook SHALL centralize all composer-related logic and state.

#### Scenario: Access composer state and handlers
```typescript
function MyComposer() {
  const {
    chatId,
    status,
    inputValue,
    textareaRef,
    handleSubmit,
    composer
  } = useChatComposer();

  return (
    <form onSubmit={(e) => handleSubmit({text: inputValue, files: []}, e)}>
      {/* Use composer state */}
    </form>
  );
}
```
Given a component needs composer functionality
When `useChatComposer()` is called
Then it returns chatId from runtime
And returns status (ready/streaming/error)
And returns inputValue from prompt controller
And returns handleSubmit function
And combines useChatRuntime, useChat, and usePromptInputController

#### Scenario: Input persists to localStorage
```typescript
function MyComposer() {
  const { inputValue } = useChatComposer();
  // inputValue automatically persists to localStorage
}
```
Given user types in the input
When the input value changes
Then it automatically saves to localStorage with key "input"
And restores from localStorage on mount
And clears localStorage on submit

### Requirement: Chat Input Component
MUST provide input field with render props for tools and actions.

#### Scenario: Input with conditional actions based on state
```typescript
<ChatInput
  placeholder="Send a message..."
  actions={({ status, hasInput }) => (
    hasInput
      ? <ChatComposerAction.Submit status={status} />
      : <ChatComposerAction.Speech />
  )}
/>
```
Given a chat input is rendered
When user has typed text (hasInput=true)
Then actions render function receives {status, hasInput, disabled}
And can conditionally render different actions
And actions update when state changes

#### Scenario: Input with header content
```typescript
<ChatInput
  header={<div>Replying to: Message #123</div>}
  placeholder="Type your reply..."
/>
```
Given input needs header content
When header prop is provided
Then content renders above textarea
And appears in PromptInputHeader section

### Requirement: Composer Tools Namespace
SHALL provide organized access to composer tools (left side of footer).

#### Scenario: Use built-in composer tools
```typescript
<ChatInput
  tools={<>
    <ChatComposerTool.AttachmentMenu />
    <ChatComposerTool.AgentSelector />
    <ChatComposerTool.ContextUsage />
  </>}
/>
```
Given a chat composer needs tools
When tools are rendered
Then AttachmentMenu opens file picker dialog
And AgentSelector displays available sub-agents
And ContextUsage shows token consumption
And all tools appear on left side of footer

#### Scenario: Tools namespace prevents collisions
```typescript
// Clear what these are - composer tools, not generic tools
import { ChatComposerTool } from '@/components/chat/composer';

<ChatComposerTool.AttachmentMenu />
```
Given multiple tool namespaces exist (ChatComposerTool, ChatArtifactAction, etc.)
When importing tools
Then namespace prevents naming collisions
And provides clear organization
And improves IDE autocomplete

### Requirement: Composer Actions Namespace
SHALL provide organized access to composer actions (right side of footer).

#### Scenario: Use built-in composer actions
```typescript
<ChatInput
  actions={<>
    <ChatComposerAction.Speech />
    <ChatComposerAction.Submit disabled={!hasInput} />
  </>}
/>
```
Given a chat composer needs actions
When actions are rendered
Then Submit sends the message
And Speech activates voice input
And both appear on right side of footer

#### Scenario: Speech action integrates with prompt controller
```typescript
// ComposerInputSpeechButton automatically calls textInput.setInput()
<ChatComposerAction.Speech />
```
Given speech action is used
When speech transcription completes
Then text automatically populates input field
And uses usePromptInputController internally
And calls onTranscriptionChange if provided

### Requirement: Agent Selector Primitive
SHALL provide agent selection UI using AI Elements ModelSelector.

#### Scenario: Display available agents
```typescript
<ChatAgentSelector
  selectedAgent={selectedAgent}
  onAgentChange={(agentId) => setSelectedAgent(agentId)}
  status={status}
/>
```
Given multiple agents are configured in `lib/ai/agent-config.ts`
When selector is rendered
Then all agents from `getAvailableAgents()` appear in list
And each shows name, description, and avatar
And search filters by agent name
And selector is disabled when status="streaming"

#### Scenario: Agent selection with ModelSelector UI
```typescript
// Uses AI Elements ModelSelector internally
<ChatAgentSelector selectedAgent={researchAgent} />
```
Given agent selector is rendered
When clicked
Then opens ModelSelector dialog
And shows searchable list
And displays agent details
And uses proper keyboard navigation
And follows AI Elements patterns

### Requirement: Chat Thread Container
SHALL provide scrollable container for messages with auto-scroll behavior.

#### Scenario: Thread with header and content
```typescript
<ChatThread>
  <ChatThreadHeader>
    <h1>Chat Title</h1>
  </ChatThreadHeader>
  <ChatThreadContent>
    <MessageIterator>...</MessageIterator>
  </ChatThreadContent>
</ChatThread>
```
Given a chat thread is rendered
When messages are added
Then content area scrolls to bottom
And header remains fixed at top
And uses StickToBottom for auto-scroll

#### Scenario: Thread provides scroll context
```typescript
// ChatThread uses StickToBottom provider
<ChatThread>
  <ChatThreadContent>
    {/* Auto-scrolls when new content added */}
  </ChatThreadContent>
  <ChatThreadScrollButton />
</ChatThread>
```
Given thread has StickToBottom provider
When new messages arrive
Then automatically scrolls to bottom if at bottom
And shows scroll button if not at bottom
And scroll button jumps to latest message

### Requirement: Message Iterator Component
SHALL provide iteration over messages with render prop pattern.

#### Scenario: Iterate and render messages
```typescript
<MessageIterator empty={<EmptyState />}>
  {({ message, isLastMessage, sender, vote, onVote, isStreaming }) => {
    if (message.role === 'user') {
      return <UserMessage message={message} />;
    }
    return <AssistantMessage message={message} vote={vote} onVote={onVote} />;
  }}
</MessageIterator>
```
Given a chat has messages
When MessageIterator renders
Then calls render function for each message
And provides message data, metadata, and callbacks
And handles empty state when no messages
And provides isStreaming for last message

#### Scenario: Iterator provides voting functionality
```typescript
<MessageIterator>
  {({ message, vote, onVote }) => (
    <AssistantMessage
      message={message}
      vote={vote}
      onVoteAction={onVote}
    />
  )}
</MessageIterator>
```
Given messages support voting
When iterator renders assistant message
Then provides current vote value from useChatVotes
And provides onVote callback
And onVote(value, notes) updates vote in database

### Requirement: Canvas Overlay Container
SHALL provide full-screen overlay for split-view artifact display.

#### Scenario: Canvas with visibility control
```typescript
<ChatCanvas isVisible={artifact.isVisible}>
  <ChatCanvasThread>{/* Messages */}</ChatCanvasThread>
  <ChatCanvasMain boundingBox={artifact.boundingBox}>
    {/* Artifact */}
  </ChatCanvasMain>
</ChatCanvas>
```
Given an artifact should be displayed
When isVisible=true
Then canvas renders full-screen overlay
And animates in with opacity transition
And positions background to account for sidebar
And uses AnimatePresence for mount/unmount

#### Scenario: Canvas responsive background
```typescript
<ChatCanvas isVisible={true}>
  {/* On desktop: adjusts for 256px sidebar */}
  {/* On mobile: full width */}
</ChatCanvas>
```
Given canvas is visible
When on desktop with sidebar open
Then background width = windowWidth, positioned to account for sidebar
And when sidebar closed, background adjusts
And on mobile, uses full viewport width

### Requirement: Canvas Thread Sidebar
SHALL provide 400px sidebar with messages during artifact viewing.

#### Scenario: Thread sidebar with animation
```typescript
<ChatCanvasThread isCurrentVersion={true}>
  <MessageIterator>...</MessageIterator>
  <ChatComposer>...</ChatComposer>
</ChatCanvasThread>
```
Given canvas is showing artifact
When thread sidebar renders
Then animates in from right (x: 10 → 0)
And has 400px fixed width
And shows messages in scrollable area
And includes composer at bottom
And has muted background color

#### Scenario: Thread sidebar overlay for old versions
```typescript
<ChatCanvasThread isCurrentVersion={false}>
  {/* Content */}
</ChatCanvasThread>
```
Given viewing old artifact version
When isCurrentVersion=false
Then shows semi-transparent overlay (bg-zinc-900/50)
And prevents interaction with thread
And animates overlay opacity

### Requirement: Canvas Main Panel
SHALL provide expanding panel for artifact content with bounded animation.

#### Scenario: Main panel with bounding box animation
```typescript
<ChatCanvasMain
  boundingBox={{
    top: 100,
    left: 50,
    width: 200,
    height: 150
  }}
>
  <DocumentArtifact />
</ChatCanvasMain>
```
Given artifact is being opened
When main panel renders
Then animates from boundingBox position/size
And expands to full size (windowWidth - 400px on desktop)
And animates smoothly with spring animation
And exit animation scales down to center

#### Scenario: Main panel responsive width
```typescript
// On desktop: width = windowWidth - 400px (thread sidebar)
// On mobile: width = windowWidth (full width)
<ChatCanvasMain boundingBox={box}>
  {children}
</ChatCanvasMain>
```
Given main panel is rendered
When on desktop
Then width = windowWidth - 400px (leaves room for thread)
And x offset = 400 (positioned after thread)
And on mobile, uses full width with no offset

### Requirement: Draft State Management
SHALL provide auto-saving draft state for artifacts.

#### Scenario: Provider with auto-save
```typescript
<ArtifactDraftProvider
  initialContent="Hello"
  onSaveAction={async (content) => {
    await saveToDatabase(content);
  }}
  debounceMs={2000}
>
  {children}
</ArtifactDraftProvider>
```
Given an editable artifact
When content changes
Then auto-saves after 2000ms debounce
And calls onSaveAction with new content
And provides isSaving state
And tracks isDirty (content !== originalContent)

#### Scenario: Access draft state in components
```typescript
function Editor() {
  const { content, setContent, isDirty, save } = useArtifactDraft();

  return (
    <textarea
      value={content}
      onChange={e => setContent(e.target.value)}
    />
  );
}
```
Given component needs draft state
When useArtifactDraft() is called
Then returns current content
And provides setContent to update
And provides isDirty flag
And provides manual save function

### Requirement: Version Management
SHALL provide version navigation and diff modes for artifacts.

#### Scenario: Provider with version list
```typescript
<ArtifactVersionProvider
  versions={[
    { id: '1', content: 'v1', createdAt: new Date() },
    { id: '2', content: 'v2', createdAt: new Date() }
  ]}
  initialIndex={-1}
  initialMode="edit"
>
  {children}
</ArtifactVersionProvider>
```
Given artifact has multiple versions
When provider renders
Then initialIndex=-1 shows latest version
And provides navigation (next/prev/latest)
And tracks current version
And provides mode (edit/diff/view)

#### Scenario: Navigate versions
```typescript
function VersionNav() {
  const {
    navigateVersion,
    canGoNext,
    canGoPrev,
    currentIndex,
    isLatest
  } = useArtifactVersion();

  return (<>
    <button onClick={() => navigateVersion('prev')} disabled={!canGoPrev}>
      Previous
    </button>
    <button onClick={() => navigateVersion('latest')} disabled={isLatest}>
      Latest
    </button>
  </>);
}
```
Given version context exists
When useArtifactVersion() is called
Then provides navigateVersion function
And navigateVersion('prev'|'next'|'latest'|number) changes version
And provides canGoNext/canGoPrev flags
And navigating to 'latest' sets mode to 'edit'

### Requirement: Data Stream Provider
SHALL provide streaming context with subscription mechanism.

#### Scenario: Provider with subscriber registry
```typescript
<DataStreamProvider>
  <MyComponent />
  <DataStreamDispatcher />
</DataStreamProvider>
```
Given streaming data needs distribution
When provider is rendered
Then maintains Set of subscribers
And provides subscribe function
And provides setDataStream to add new parts
And provides _registerSubscriber for dispatcher access

#### Scenario: Subscribe to stream parts
```typescript
function MyFeature() {
  useDataStreamSubscription(
    (part) => part.type.startsWith('data-'),
    (part) => {
      console.log('Received:', part);
    }
  );
}
```
Given component needs stream updates
When useDataStreamSubscription is called with filter
Then subscribes to stream
And receives parts matching filter
And unsubscribes on unmount
And provides cleanup function

### Requirement: Stream Dispatcher
MUST dispatch stream parts to all subscribers.

#### Scenario: Dispatcher processes stream
```typescript
<DataStreamProvider>
  <DataStreamDispatcher />
  {/* Components with subscriptions */}
</DataStreamProvider>
```
Given stream has new parts
When dataStream state updates
Then dispatcher processes all new parts
And notifies each subscriber
And clears dataStream after processing
And uses for...of loop (not forEach)

#### Scenario: Multiple subscribers receive parts
```typescript
// Component A
useDataStreamSubscription(
  (part) => part.type === 'data-title',
  (part) => setTitle(part.data)
);

// Component B
useDataStreamSubscription(
  (part) => part.type === 'data-content',
  (part) => setContent(part.data)
);
```
Given multiple components subscribe
When stream part arrives
Then both components receive part
And each applies its own filter
And only matching handlers are called

### Requirement: Feature-Specific Subscriptions
SHALL provide hooks for common streaming patterns.

#### Scenario: Artifact streaming hook
```typescript
function MyArtifact() {
  useArtifactStreaming();
  // Automatically handles all artifact stream parts
}
```
Given component displays artifacts
When useArtifactStreaming() is called
Then subscribes to all 'data-*' parts
And updates artifact state based on part type
And handles data-title, data-content, data-kind, data-clear, data-finish
And delegates to artifact definition onStreamPart if available

### Requirement: Auto Resume Effect
MUST automatically resume streaming when last message is from user.

#### Scenario: Resume on mount with user message
```typescript
<ChatAutoResume
  initialMessages={messages}
  enabled={true}
/>
```
Given chat was interrupted with user's message
When component mounts
And initialMessages.at(-1).role === 'user'
Then calls chat.resumeStream()
And resumes assistant response
And enabled flag controls behavior

#### Scenario: Disable auto-resume
```typescript
<ChatAutoResume enabled={false} />
```
Given auto-resume should be disabled
When enabled=false
Then does not resume stream
And returns null (no render)

### Requirement: Route Params Handler Effect
SHALL handle URL query parameters for chat initialization.

#### Scenario: Send message from query param
```typescript
// URL: /chat/123?query=What+is+React
<ChatRouteParamsHandler />
```
Given URL has ?query parameter
When component mounts
And no messages exist (or only one assistant message)
Then sends query as user message
And removes query param from URL
And only appends once (uses ref to track)

#### Scenario: Skip query if messages exist
```typescript
// URL: /chat/123?query=Hello
// Chat already has messages
<ChatRouteParamsHandler />
```
Given chat already has user messages
When component mounts
Then does not send query parameter
And leaves existing conversation intact

### Requirement: Artifact Display Components
SHALL provide header, body, and footer primitives for artifacts.

#### Scenario: Artifact header with actions
```typescript
<ChatArtifactHeader
  title="My Document"
  subtitle="Updated 2 minutes ago"
  onClose={() => closeArtifact()}
  actions={<>
    <ChatArtifactAction.Copy />
    <ChatArtifactAction.Download />
  </>}
/>
```
Given artifact needs header
When header renders
Then shows title and subtitle
And shows close button that calls onClose
And renders action buttons on right
And uses ArtifactHeader from AI Elements

#### Scenario: Artifact body with toolbar
```typescript
<ChatArtifactBody
  toolbar={isLatest ? <Toolbar /> : null}
>
  <DocumentEditor content={content} />
</ChatArtifactBody>
```
Given artifact content needs display
When body renders
Then wraps content in scrollable container
And shows toolbar overlay if provided
And uses AnimatePresence for toolbar
And uses ArtifactContent from AI Elements

#### Scenario: Artifact footer for versions
```typescript
<ChatArtifactFooter visible={!isLatest}>
  <VersionFooter />
</ChatArtifactFooter>
```
Given artifact can show footer
When visible=true
Then renders children in AnimatePresence
And when visible=false, hides content
And commonly used for version navigation

### Requirement: Artifact Actions Namespace
SHALL provide organized artifact actions.

#### Scenario: Use artifact actions
```typescript
<ChatArtifactAction.PrevVersion
  icon={<ChevronLeft />}
  tooltip="Previous version"
/>
<ChatArtifactAction.Copy content={text} />
<ChatArtifactAction.Download
  content={text}
  filename="document.txt"
/>
```
Given artifact needs actions
When actions are rendered
Then PrevVersion navigates to previous version using useArtifactVersion
And Copy copies content to clipboard
And Download creates blob and downloads file
And all actions are properly typed

### Requirement: Context Usage Display
SHALL show token usage information for the chat.

#### Scenario: Display token usage
```typescript
<ChatContextUsage
  maxTokens={128000}
  usedTokens={5000}
/>
```
Given chat has token usage data
When component renders
Then shows input tokens, output tokens, reasoning tokens, cache usage
And displays usage as percentage of max
And uses useChatUsage hook for real-time data
And wraps AI Elements Context components

## Notes

### Component Organization
All primitives organized under `components/chat/`:
- `composer.tsx` - Input and composition
- `thread.tsx` - Message display
- `canvas.tsx` - Split view layout
- `artifact.tsx` - Artifact display primitives
- `streaming.tsx` - Stream infrastructure
- `effects.tsx` - Side effect components
- `iterators.tsx` - Message iteration
- `message.tsx` - Message rendering
- `usage.tsx` - Token usage display
- `agent-selector.tsx` - Agent selection

### Design Patterns
- **Namespace exports**: `ChatComposerTool.*`, `ChatComposerAction.*`, `ChatArtifactAction.*`
- **Centralized hooks**: `useChatComposer`, `useDataStreamSubscription`, `useArtifactDraft`
- **Render props**: Flexible conditional rendering based on state
- **Side effects as components**: `<ChatAutoResume />`, `<ChatRouteParamsHandler />`
- **Subscription pattern**: Generic infrastructure with feature-specific hooks

### Related Capabilities
- Depends on: `tool-ui`, `mastra-agent-integration`, `internationalization`
- Related to: AI Elements framework, AI SDK streaming

### Cross-References
See `design.md` for detailed architectural decisions and patterns.
See `openspec/project.md` for integration with project conventions.
