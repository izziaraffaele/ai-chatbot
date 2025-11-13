# client-tools Specification

## Purpose
TBD - created by archiving change add-client-tools. Update Purpose after archive.
## Requirements
### Requirement: Client Tool Registry
The system SHALL provide a registry for defining and managing client-side tools that execute in the browser environment.

#### Scenario: Define a simple client tool
- **WHEN** a client tool is defined with id, description, inputSchema, and execute handler
- **THEN** the tool SHALL be registered and available for use by agents
- **AND** the tool definition SHALL be type-safe via TypeScript and Zod

#### Scenario: Access tool from registry
- **WHEN** the chat component initializes
- **THEN** it SHALL retrieve all registered client tools from the registry
- **AND** pass them to the Mastra agent for client-side execution

### Requirement: useClientTools Hook
The system SHALL provide a React hook for accessing and managing client tools in components.

#### Scenario: Hook returns client tools object
- **WHEN** a component calls `useClientTools()`
- **THEN** the hook SHALL return an object containing all registered client tools
- **AND** the tools SHALL be ready for passing to the agent

#### Scenario: Hook is available in chat component
- **WHEN** the chat component renders
- **THEN** it SHALL call `useClientTools()` to get available tools
- **AND** pass them to the agent via the `clientTools` parameter

### Requirement: Client Tool Execution
The system SHALL execute client tools when the Mastra agent calls them during conversation.

#### Scenario: Agent invokes a client tool
- **WHEN** an agent requests execution of a client tool
- **THEN** the tool's execute handler SHALL run in the browser
- **AND** the tool's result SHALL be returned to the agent
- **AND** the agent SHALL continue processing based on the result

#### Scenario: Client tool can access browser APIs
- **WHEN** a client tool executes
- **THEN** it SHALL have access to browser APIs (DOM, localStorage, etc.)
- **AND** it SHALL be able to modify page state if needed

### Requirement: Example Client Tool
The system SHALL provide a simple example client tool demonstrating basic functionality.

#### Scenario: Example tool performs browser operation
- **WHEN** the example client tool is invoked by the agent
- **THEN** it SHALL execute a simple browser operation
- **AND** return success confirmation to the agent
- **AND** serve as a template for creating additional client tools

### Requirement: Stream Processing for Client Tools
The system SHALL handle streaming client tool results back to the chat interface.

#### Scenario: Client tool events are processed during stream
- **WHEN** the Mastra agent processes a response containing client tool calls
- **THEN** the stream consumer SHALL detect tool invocations
- **AND** pass them to the appropriate client tool
- **AND** continue streaming the response after tool execution

#### Scenario: Client tool result is sent to agent
- **WHEN** a client tool completes execution
- **THEN** the result SHALL be captured and sent back to the agent
- **AND** the agent SHALL incorporate the result in its response

### Requirement: Type Safety for Client Tools
The system SHALL ensure all client tools are type-safe and properly validated.

#### Scenario: Tool input is validated against schema
- **WHEN** an agent calls a client tool with parameters
- **THEN** the parameters SHALL be validated against the tool's Zod schema
- **AND** invalid parameters SHALL cause a validation error
- **AND** the tool SHALL not execute with invalid input

#### Scenario: Client tools have proper TypeScript types
- **WHEN** a developer registers a new client tool
- **THEN** TypeScript SHALL enforce correct schema and handler types
- **AND** IDE autocompletion SHALL work for tool parameters

