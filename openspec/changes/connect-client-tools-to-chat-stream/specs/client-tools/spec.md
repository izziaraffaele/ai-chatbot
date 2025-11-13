## ADDED Requirements

### Requirement: Client Tool Call Handler
The system SHALL provide a `processClientToolCall()` function in `lib/ai/client-tools.ts` that processes tool invocations from the Vercel AI SDK `useChat` hook and executes registered client tools.

#### Scenario: Handler receives tool call from stream
- **WHEN** `useChat` hook's `onToolCall` callback receives a tool invocation
- **THEN** the handler SHALL receive the `toolCall` object with `toolName`, `toolCallId`, and `input` properties
- **AND** the handler SHALL determine if the tool is a registered client tool

#### Scenario: Handler executes registered tool
- **WHEN** a registered client tool is invoked by name
- **THEN** the handler SHALL look up the tool in the registry by `toolName`
- **AND** the handler SHALL execute the tool's `execute()` function with the provided input
- **AND** the handler SHALL capture the result or error

#### Scenario: Handler returns typed result
- **WHEN** a client tool execution completes successfully
- **THEN** the handler SHALL return an object containing the tool result
- **AND** the returned object SHALL be compatible with `useChat`'s `addToolOutput()` method
- **AND** the object SHALL include `toolCallId`, `tool` (name), and `output` (result)

#### Scenario: Handler manages errors gracefully
- **WHEN** a client tool execution fails (invalid input, execution error)
- **THEN** the handler SHALL catch the error and format it as a tool result
- **AND** the error message SHALL be returned to the agent for further processing
- **AND** execution SHALL not throw an unhandled exception

#### Scenario: Handler handles dynamic tools correctly
- **WHEN** a tool call with `dynamic: true` is received
- **THEN** the handler SHALL skip processing (per Vercel AI SDK guidance)
- **AND** return without attempting to look up or execute the tool

### Requirement: Tool Serialization Naming
The system SHALL use clear naming to distinguish between tool serialization and tool execution.

#### Scenario: Serialize function has clear purpose
- **WHEN** developers review `lib/ai/client-tools.ts`
- **THEN** they SHALL understand that `serializeClientTools()` converts tool definitions to JSON schema
- **AND** they SHALL understand that `processClientToolCall()` executes tool invocations
- **AND** the function names SHALL be distinct and reflect their respective purposes

### Requirement: useChat Integration
The system SHALL integrate the client tool handler into the chat component's `useChat` configuration.

#### Scenario: Chat component handles client tool calls
- **WHEN** a message is streamed that contains a client tool invocation
- **THEN** the chat component's `onToolCall` callback SHALL be triggered
- **AND** the callback SHALL call `processClientToolCall()` to execute the tool
- **AND** the result SHALL be sent back to the stream via `addToolOutput()`

#### Scenario: Dynamic tools are properly skipped
- **WHEN** a tool call with `dynamic: true` is received in the stream
- **THEN** the `onToolCall` handler SHALL check `toolCall.dynamic` first
- **AND** return early without processing (avoiding TypeScript narrowing errors)
- **AND** allow Vercel AI SDK to handle dynamic tools normally

## MODIFIED Requirements

### Requirement: Client Tool Registry
The system SHALL provide a registry for defining and managing client-side tools that execute in the browser environment.

#### Scenario: Define a simple client tool
- **WHEN** a client tool is defined with id, description, inputSchema, and execute handler
- **THEN** the tool SHALL be registered and available for use by agents
- **AND** the tool definition SHALL be type-safe via TypeScript and Zod

#### Scenario: Access tool from registry and execute in chat
- **WHEN** a tool is registered via `useAssistantAction()` and the agent calls it
- **THEN** the chat component SHALL retrieve the tool from the registry
- **AND** call `processClientToolCall()` to execute the tool
- **AND** send the result back to the agent via the stream

#### Scenario: Serialize tools for API transmission
- **WHEN** the chat component prepares a request to the chat API
- **THEN** it SHALL call `serializeClientTools()` to convert registered tools to JSON schema
- **AND** send the serialized tools in the request body
- **AND** the agent SHALL receive the tool definitions for invocation planning

### Requirement: Stream Processing for Client Tools
The system SHALL handle streaming client tool results back to the chat interface.

#### Scenario: Client tool events are processed during stream
- **WHEN** the Mastra agent processes a response containing client tool calls
- **THEN** the stream consumer (chat component via `useChat`) SHALL detect tool invocations
- **AND** pass them to `processClientToolCall()` via `onToolCall` callback
- **AND** continue streaming the response after tool execution and result submission

#### Scenario: Client tool result is sent to agent
- **WHEN** a client tool completes execution via `processClientToolCall()`
- **THEN** the result SHALL be sent back to the stream via `addToolOutput()`
- **AND** the agent SHALL incorporate the result in its response
- **AND** the tool execution SHALL complete within the streaming context
