# prompt-input Specification

## ADDED Requirements

### Requirement: MessageInput Component Composition

The system SHALL provide a `MessageInput` component that composes AI Elements `<PromptInput />` with app-specific chat input features.

#### Scenario: Component accepts required props
- **WHEN** MessageInput is instantiated
- **THEN** it SHALL accept props: `chatId`, `input`, `setInput`, `status`, `stop`, `attachments`, `setAttachments`, `messages`, `setMessages`, `sendMessage`, `selectedVisibilityType`, `usage` (optional)
- **AND** TypeScript SHALL enforce type safety for all props

#### Scenario: Component renders PromptInput composition
- **WHEN** MessageInput renders
- **THEN** it SHALL render `<PromptInput onSubmit={...}>` as the root element
- **AND** the PromptInput SHALL contain: textarea, attachment preview, toolbar with buttons
- **AND** all child elements SHALL be properly composed using AI Elements sub-components

### Requirement: Suggested Actions Display

The system SHALL display suggested actions above the chat input when conversation is empty.

#### Scenario: Suggested actions appear on empty conversation
- **WHEN** messages.length === 0 AND attachments.length === 0 AND uploadQueue.length === 0
- **THEN** MessageInput SHALL render the `<SuggestedActions />` component
- **AND** suggested actions MUST appear above the PromptInput container

#### Scenario: Suggested actions disappear when conversation starts
- **WHEN** first message is sent (messages.length > 0)
- **THEN** suggested actions SHALL be hidden
- **AND** only the input area and sent messages SHALL be visible

### Requirement: Attachment Management

The system SHALL manage file attachments with upload, preview, and removal.

#### Scenario: File selection via button
- **WHEN** user clicks the attachments button
- **THEN** a file input dialog SHALL open
- **AND** user can select one or multiple files

#### Scenario: File upload processing
- **WHEN** files are selected or pasted
- **THEN** each file SHALL be uploaded to `/api/files/upload`
- **AND** FormData SHALL include the file with key 'file'
- **AND** successful response SHALL include: `url`, `pathname` (name), `contentType`

#### Scenario: Attachment preview display
- **WHEN** files are successfully uploaded
- **THEN** MessageInput SHALL display `<PreviewAttachment />` components for each file
- **AND** preview SHALL show file name, type indicator, and remove button
- **AND** preview items SHALL be scrollable horizontally in a flex row

#### Scenario: Attachment removal
- **WHEN** user clicks remove button on preview
- **THEN** the attachment SHALL be removed from the attachments array
- **AND** file input value SHALL be cleared
- **AND** preview SHALL immediately disappear

#### Scenario: Upload progress indication
- **WHEN** files are being uploaded
- **THEN** MessageInput SHALL track uploadQueue state
- **AND** uploading files SHALL show loading indicator in preview
- **AND** send button SHALL be disabled while uploadQueue.length > 0

### Requirement: Textarea Input Handling

The system SHALL provide an auto-resizing textarea with proper state management.

#### Scenario: Textarea syncs with input prop
- **WHEN** input prop changes
- **THEN** textarea value SHALL reflect the new input value
- **AND** height adjustment SHALL occur if content height changed

#### Scenario: Textarea input updates state
- **WHEN** user types in textarea
- **THEN** onChange event SHALL call setInput with new value
- **AND** parent component state SHALL update

#### Scenario: Textarea auto-resize
- **WHEN** content height changes (e.g., user adds new line)
- **THEN** textarea height SHALL expand (minimum 44px, maximum 200px)
- **AND** content SHALL scroll vertically if exceeding maxHeight

#### Scenario: Textarea reset after send
- **WHEN** message is submitted
- **THEN** textarea content SHALL be cleared
- **AND** height SHALL reset to minHeight (44px)
- **AND** focus SHALL return to textarea (on desktop)

### Requirement: Clipboard Paste Image Support

The system SHALL allow users to paste images directly from clipboard.

#### Scenario: Paste image from clipboard
- **WHEN** user pastes image(s) from clipboard into textarea
- **THEN** system SHALL detect image MIME types in clipboard data
- **AND** images SHALL be uploaded via `/api/files/upload`
- **AND** attachments SHALL be added without interrupting text input

#### Scenario: Text paste behavior preserved
- **WHEN** user pastes text (non-image) content
- **THEN** default browser paste behavior SHALL proceed normally
- **AND** text SHALL be inserted at cursor position

#### Scenario: Multiple paste sources
- **WHEN** user pastes multiple images or mixed media
- **THEN** system SHALL handle all image items in clipboard
- **AND** only image files SHALL be uploaded; other content SHALL use default paste

### Requirement: Form Submission

The system SHALL handle message submission with proper state and message formatting.

#### Scenario: Submit button behavior
- **WHEN** PromptInputSubmit button is clicked or form is submitted
- **THEN** preventDefault() SHALL prevent default form behavior
- **AND** submitForm() callback SHALL be invoked

#### Scenario: Submit validation
- **WHEN** form submission is triggered
- **THEN** system SHALL check status !== 'ready'
- **AND** if not ready, SHALL show toast error: "Please wait for the model to finish its response!"
- **AND** otherwise SHALL proceed with submitForm()

#### Scenario: Message creation on submit
- **WHEN** submitForm() is called
- **THEN** system SHALL create message object with parts array:
  - File parts for each attachment (type='file', url, name, mediaType)
  - Text part for textarea content (type='text', text)
- **AND** message SHALL be sent via sendMessage() callback

#### Scenario: State cleanup after submit
- **WHEN** message is sent
- **THEN** attachments array SHALL be cleared
- **AND** textarea content SHALL be cleared
- **AND** localStorage input SHALL be cleared
- **AND** URL SHALL update to `/chat/{chatId}`

#### Scenario: Send button disabled states
- **WHEN** input is empty OR uploadQueue has pending files
- **THEN** PromptInputSubmit button SHALL be disabled
- **AND** disabled state SHALL be reflected visually

### Requirement: Toolbar with Agent Selection

The system SHALL provide a toolbar with attachment button and agent selector.

#### Scenario: Toolbar contains action buttons
- **WHEN** MessageInput renders
- **THEN** `<PromptInputToolbar>` SHALL contain:
  - AttachmentsButton (file upload trigger)
  - AgentSelector (model/agent selection)
- **AND** optional StopButton (when status === 'submitted')

#### Scenario: AttachmentsButton functionality
- **WHEN** AttachmentsButton is clicked
- **THEN** hidden file input SHALL be triggered
- **AND** file dialog SHALL appear
- **AND** button SHALL be disabled when status !== 'ready'

#### Scenario: AgentSelector in toolbar
- **WHEN** AgentSelector is rendered in toolbar
- **THEN** it SHALL display selected agent name or "Assistant" placeholder
- **THEN** clicking SHALL open dropdown menu with available agents
- **AND** selecting an agent SHALL call onAgentChange callback
- **AND** menu SHALL close after selection

#### Scenario: StopButton appears during streaming
- **WHEN** status === 'submitted' (streaming in progress)
- **THEN** StopButton SHALL replace PromptInputSubmit button
- **AND** clicking SHALL call stop() callback
- **AND** setMessages(messages) SHALL be called to re-render messages

### Requirement: Input State Persistence

The system SHALL persist textarea content to localStorage for recovery after page reload.

#### Scenario: Textarea content saved to localStorage
- **WHEN** input value changes
- **THEN** content SHALL be saved to localStorage key 'input'
- **AND** save SHALL occur on each input change (debouncing optional)

#### Scenario: Restore from localStorage on mount
- **WHEN** MessageInput component mounts
- **THEN** system SHALL read value from localStorage key 'input'
- **AND** if localStorage has value AND textarea is empty, restored value SHALL be set

#### Scenario: Clear localStorage after send
- **WHEN** message is submitted successfully
- **THEN** localStorage key 'input' SHALL be cleared
- **AND** next page reload SHALL start with empty textarea

### Requirement: Context Display

The system SHALL display user context information alongside the input area.

#### Scenario: Context component renders
- **WHEN** MessageInput renders
- **THEN** `<Context usage={usage} />` component SHALL be rendered
- **AND** it SHALL appear in the flex row with textarea
- **AND** it SHALL display usage information if provided

### Requirement: Integration with AI SDK Chat

The system SHALL integrate seamlessly with Vercel AI SDK `useChat()` hook.

#### Scenario: Props match useChat() helpers
- **WHEN** MessageInput is used with useChat()
- **THEN** all prop types SHALL be compatible with `UseChatHelpers<ChatMessage>`
- **AND** status prop SHALL reflect chat streaming state ('ready', 'submitted', etc.)
- **AND** setMessages, sendMessage callbacks SHALL work correctly with useChat()

#### Scenario: Message part format matches AI SDK
- **WHEN** messages are created by MessageInput
- **THEN** parts array format SHALL match AI SDK v5 spec
- **AND** file parts SHALL have: type='file', url, name, mediaType
- **AND** text parts SHALL have: type='text', text
