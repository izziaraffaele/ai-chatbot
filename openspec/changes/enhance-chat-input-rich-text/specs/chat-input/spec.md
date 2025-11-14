# Chat Input Specification

## Purpose

Defines the rich text chat input component with @agent mention support. Enables users to explicitly invoke specialized sub-agents through mention-style interaction while maintaining seamless integration with the existing Mastra agent routing system.

## ADDED Requirements

### Requirement: ProseMirror-Based Rich Text Editor

The system SHALL provide a rich text editor based on ProseMirror for composing chat messages, replacing the simple textarea input.

#### Scenario: Editor renders with placeholder text

- **WHEN** the chat input is loaded
- **THEN** the editor SHALL display placeholder text (e.g., "What would you like to know?")
- **AND** the placeholder SHALL disappear when user starts typing

#### Scenario: Single and multi-line input support

- **WHEN** user presses Enter without modifiers
- **THEN** the message SHALL be submitted (same as current behavior)

- **WHEN** user presses Shift+Enter
- **THEN** a newline SHALL be inserted in the message (same as current behavior)

#### Scenario: Auto-resize editor height

- **WHEN** user types multiple lines
- **THEN** the editor height SHALL expand to accommodate content
- **AND** height SHALL not exceed maximum (e.g., 164px)

#### Scenario: Disabled state

- **WHEN** chat is loading or streaming
- **THEN** the editor SHALL be disabled
- **AND** submit button SHALL be disabled

### Requirement: Agent Mention System

The system SHALL support @mention syntax to explicitly invoke or reference sub-agents configured as tools in the main chat agent.

#### Scenario: User triggers mention with @ character

- **WHEN** user types `@` in the editor
- **THEN** a mention autocomplete dropdown SHALL appear
- **AND** the dropdown SHALL show available agents

#### Scenario: Autocomplete filters agents by name

- **WHEN** user types `@res`
- **THEN** the dropdown SHALL filter and show only matching agents (e.g., "Researcher")
- **AND** the filter SHALL be case-insensitive

#### Scenario: Mention node is inserted and styled

- **WHEN** user selects an agent from the autocomplete dropdown
- **THEN** a mention node SHALL be inserted in the editor
- **AND** the mention SHALL display as a styled badge with agent avatar and name
- **AND** the mention SHALL preserve agent metadata (id, name, avatar)

#### Scenario: Mention can be removed

- **WHEN** user presses Backspace with cursor at the end of a mention node
- **THEN** the mention SHALL be deleted
- **AND** the editor state SHALL be updated

#### Scenario: Multiple mentions in single message

- **WHEN** user inserts multiple @ mentions in one message
- **THEN** all mentions SHALL be preserved in the editor
- **AND** all mentions SHALL be serialized to plain text on send

### Requirement: Mention Autocomplete Dropdown

The system SHALL provide a keyboard-accessible autocomplete dropdown for agent selection.

#### Scenario: Autocomplete displays agent details

- **WHEN** mention autocomplete is open
- **THEN** each agent entry SHALL show: avatar (emoji or icon), name, description
- **AND** agents SHALL be displayed in a scrollable list (max 5 visible by default)

#### Scenario: Keyboard navigation in autocomplete

- **WHEN** autocomplete is open
- **THEN** user SHALL navigate with arrow keys (up/down)
- **AND** pressing Enter SHALL select the current item
- **AND** pressing Escape SHALL close autocomplete without selection

#### Scenario: Autocomplete closes after selection

- **WHEN** user selects an agent from the dropdown
- **THEN** the autocomplete SHALL close
- **AND** focus SHALL return to the editor
- **AND** user can continue typing or insert another mention

#### Scenario: No results messaging

- **WHEN** typed @ mention filter has no matching agents
- **THEN** the dropdown SHALL display "No agents found"
- **AND** the dropdown SHALL remain open for further typing

### Requirement: Message Serialization

The system SHALL serialize mentions to plain text while preserving mention data for agent routing.

#### Scenario: Mentions serialize to plain text

- **WHEN** user sends a message with mentions (e.g., "@researcher can you analyze this?")
- **THEN** the message text SHALL include the mention text: "@Researcher can you analyze this?"
- **AND** the message SHALL be sent to the `/api/chat` endpoint as before

#### Scenario: Mention metadata is available to agents

- **WHEN** a message contains mentions
- **THEN** the message data SHALL preserve mention metadata (id, name, avatar)
- **AND** the Mastra agent system SHALL use mention data for routing/context

#### Scenario: Backward compatibility with plain text

- **WHEN** user sends a message with no mentions
- **THEN** the message SHALL be sent exactly as before
- **AND** all existing chat flows SHALL work without modification

### Requirement: Agent Configuration

The system SHALL use centralized agent configuration for mention display and selection.

#### Scenario: Agent config defines available agents

- **WHEN** the application loads
- **THEN** agent configuration from `lib/ai/agent-config.ts` SHALL be loaded
- **AND** it SHALL contain agent definitions: id, name, description, avatar, optional color and icon
- **AND** agents available in mention autocomplete SHALL match configured agents

#### Scenario: Agent config is extensible

- **WHEN** a new sub-agent is added to the chat system
- **THEN** developers SHALL update `lib/ai/agent-config.ts` to include the new agent
- **AND** the new agent SHALL automatically appear in mention autocomplete
- **AND** the agent SHALL be available across all features using agent config

### Requirement: Accessibility & Styling

The system SHALL ensure mention interactions are accessible and visually distinct.

#### Scenario: Mention nodes have visual distinction

- **WHEN** a mention is inserted in the editor
- **THEN** it SHALL render with distinct styling (badge, color, icon)
- **AND** the styling SHALL be visible in both light and dark modes

#### Scenario: Autocomplete is keyboard navigable

- **WHEN** autocomplete is open
- **THEN** it SHALL have proper ARIA roles and labels
- **AND** focus management SHALL trap focus within the dropdown while open
- **AND** screen readers SHALL announce agent names and descriptions

#### Scenario: Mention removal is keyboard accessible

- **WHEN** user has cursor at the end of a mention
- **THEN** pressing Backspace SHALL remove the mention
- **AND** no additional interaction SHALL be required
