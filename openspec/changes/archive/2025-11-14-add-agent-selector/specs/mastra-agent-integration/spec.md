## ADDED Requirements

### Requirement: Agent Configuration
The system SHALL maintain a centralized configuration of available agents for selector display.

#### Scenario: Agent config defines available agents
- **WHEN** the application loads
- **THEN** agent configuration file (`lib/ai/agent-config.ts`) SHALL be loaded
- **AND** it SHALL contain agent definitions: id, name, description, avatar (emoji or URL), optional color and icon
- **AND** agents available in selector SHALL match configured agents

### Requirement: Sub-Agent Selection UI
The system SHALL provide a user interface for selecting which sub-agent the chat agent will invoke for specialized tasks.

#### Scenario: Agent selector displays available sub-agents
- **WHEN** the user opens the chat input interface
- **THEN** an agent selector dropdown SHALL be displayed
- **AND** the dropdown SHALL list all available sub-agents from `lib/ai/agent-config.ts` (e.g., Research)
- **AND** each sub-agent SHALL display name, description, and avatar

#### Scenario: User selects a sub-agent
- **WHEN** the user clicks the agent selector dropdown
- **THEN** the dropdown menu SHALL open
- **AND** the user SHALL be able to click a sub-agent to select it
- **AND** the selected sub-agent SHALL be visually highlighted
- **AND** the trigger button SHALL update to show the newly selected sub-agent

#### Scenario: Default sub-agent is selected on first load
- **WHEN** the user first loads the chat interface
- **THEN** the first available sub-agent (Research) SHALL be selected by default
- **AND** the agent selector SHALL display the default sub-agent

### Requirement: Sub-Agent Selection Persistence
The system SHALL persist the user's selected sub-agent preference to browser local storage.

#### Scenario: Selected sub-agent is saved to local storage
- **WHEN** a user selects a sub-agent from the dropdown
- **THEN** the selection SHALL be saved to the browser's local storage
- **AND** the key used SHALL be 'selectedAgent'

#### Scenario: Sub-agent selection is restored from local storage
- **WHEN** the user returns to the chat interface after closing the browser
- **THEN** the previously selected sub-agent SHALL be restored from local storage
- **AND** the agent selector SHALL display the restored selection

#### Scenario: Local storage fallback to default
- **WHEN** local storage is empty or contains an invalid sub-agent ID
- **THEN** the system SHALL fall back to the first available sub-agent
- **AND** the invalid entry SHALL be cleared from local storage

### Requirement: Selected Sub-Agent Passed to Chat Request
The system SHALL include the selected sub-agent in the chat request sent to the API.

#### Scenario: Sub-agent is included in request body
- **WHEN** a user sends a chat message
- **THEN** the chat request body SHALL include the selected sub-agent ID
- **AND** the chat API route SHALL receive the sub-agent parameter

#### Scenario: Chat agent receives sub-agent context
- **WHEN** the chat API receives a request with a selected sub-agent
- **THEN** the chat agent SHALL be aware of the requested sub-agent
- **AND** the agent SHALL invoke or reference the selected sub-agent as appropriate
