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

### Requirement: useClientTools Hook
The system SHALL provide a React hook that returns a registry object for managing assistant actions in components.

#### Scenario: Hook returns registry object
- **WHEN** a component calls `useClientTools()`
- **THEN** the hook SHALL return a registry object with methods: `register(action)`, `deregister(id)`, and `getTools()`
- **AND** the registry SHALL be stable across component renders

#### Scenario: Registry provides all registered actions
- **WHEN** the chat component calls `registry.getTools()`
- **THEN** the registry SHALL return an object containing all currently registered actions
- **AND** the actions SHALL be available to the Mastra agent for execution

### Requirement: Client Tool Execution
The system SHALL execute client actions when the Mastra agent calls them during conversation.

#### Scenario: Agent invokes a registered client action
- **WHEN** an agent requests execution of a registered client action
- **THEN** the action's execute handler SHALL run in the browser
- **AND** the action's result SHALL be returned to the agent
- **AND** the agent SHALL continue processing based on the result

#### Scenario: Client action can access browser APIs
- **WHEN** a client action executes
- **THEN** it SHALL have access to browser APIs (DOM, localStorage, clipboard, etc.)
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
- **THEN** the stream consumer (chat component via `useChat`) SHALL detect tool invocations
- **AND** pass them to `processClientToolCall()` via `onToolCall` callback
- **AND** continue streaming the response after tool execution and result submission

#### Scenario: Client tool result is sent to agent
- **WHEN** a client tool completes execution via `processClientToolCall()`
- **THEN** the result SHALL be sent back to the stream via `addToolOutput()`
- **AND** the agent SHALL incorporate the result in its response
- **AND** the tool execution SHALL complete within the streaming context

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

### Requirement: Dynamic Assistant Action Registration
The system SHALL support registering assistant actions from React components at runtime via the `useAssistantAction()` hook.

#### Scenario: Register action on component mount
- **WHEN** a component calls `useAssistantAction(action)` during render
- **THEN** the action SHALL be registered in the registry on component mount
- **AND** the action SHALL be available to the agent in subsequent chat messages

#### Scenario: Deregister action on component unmount
- **WHEN** a component using `useAssistantAction(action)` unmounts
- **THEN** the action SHALL be automatically deregistered from the registry
- **AND** the action SHALL no longer be available to the agent

#### Scenario: Lifecycle works with strict mode
- **WHEN** React strict mode double-mounts a component
- **THEN** the component's action SHALL still be correctly registered and deregistered
- **AND** deregistration SHALL be idempotent (safe to call multiple times)

### Requirement: Registry API
The system SHALL provide a registry object with methods for managing assistant actions.

#### Scenario: Register action via registry
- **WHEN** code calls `registry.register(action)` where action has a unique ID
- **THEN** the action SHALL be added to the registry
- **AND** if an action with the same ID exists, it SHALL be replaced

#### Scenario: Deregister action via registry
- **WHEN** code calls `registry.deregister(actionId)`
- **THEN** the action SHALL be removed from the registry
- **AND** subsequent calls to deregister the same ID SHALL not raise errors (idempotent)

#### Scenario: Registry starts empty
- **WHEN** the application initializes
- **THEN** the registry SHALL contain no actions initially
- **AND** actions SHALL only be added when explicitly registered

#### Scenario: Get all registered actions
- **WHEN** code calls `registry.getTools()`
- **THEN** the registry SHALL return an object containing all currently registered actions
- **AND** if no actions are registered, an empty object SHALL be returned
- **AND** the returned object SHALL be compatible with Mastra agent serialization

### Requirement: useAssistantAction Hook
The system SHALL provide a React hook for simplified action registration in components.

#### Scenario: Hook simplifies action registration
- **WHEN** a component calls `useAssistantAction(action)`
- **THEN** the hook SHALL handle registration on mount and deregistration on unmount automatically
- **AND** the developer SHALL not need to write manual useEffect cleanup code

#### Scenario: Multiple components can register actions
- **WHEN** multiple components each call `useAssistantAction()` with their respective actions
- **THEN** all actions SHALL be registered and available to the agent
- **AND** each action SHALL be deregistered only when its component unmounts

### Requirement: Type Safety for Dynamic Actions
The system SHALL maintain type safety for dynamically registered actions.

#### Scenario: Registered actions have correct types
- **WHEN** an action is registered via `useAssistantAction(action)` or `registry.register(action)`
- **THEN** the action's inputSchema (Zod schema) and execute handler SHALL be validated at registration
- **AND** TypeScript SHALL enforce correct types for the action parameter

#### Scenario: getTools returns typed actions
- **WHEN** code receives the result of `registry.getTools()`
- **THEN** TypeScript SHALL provide autocomplete for registered action IDs
- **AND** the types SHALL match the action definitions

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

### Requirement: ActivityToolProvider Architecture
The system SHALL provide a consolidated ActivityToolProvider that wraps the assistant chat and manages the complete activity lifecycle through Promise resolution.

#### Scenario: ActivityToolProvider initialization
- **WHEN** ActivityToolProvider wraps the assistant chat component
- **THEN** system registers `createActivity` client tool with type-safe Zod schemas
- **AND** provider initializes Promise resolver storage for activity completion

#### Scenario: Promise-based activity execution
- **WHEN** assistant calls `createActivity` tool with valid input
- **THEN** tool creates Promise and stores resolver using toolCallId in provider state
- **AND** tool returns activity data for UI rendering while Promise remains pending

### Requirement: Dynamic Activity Creation
The system SHALL enable the assistant to create interactive activities dynamically through the `createActivity` client tool.

#### Scenario: Assistant creates quiz activity
- **WHEN** assistant calls `createActivity` tool with type 'quiz' and valid QuizQuestion array
- **THEN** system validates content against QuizQuestion schema and creates Promise for completion
- **AND** activity data is returned for UI rendering in chat interface

#### Scenario: Assistant creates flashcard activity
- **WHEN** assistant calls `createActivity` tool with type 'flashcards' and valid Flashcard array
- **THEN** system validates content against Flashcard schema and creates Promise for completion
- **AND** activity data is returned for UI rendering in chat interface

### Requirement: Type-Safe Activity Content Validation
The system SHALL validate activity content using Zod schemas that match existing QuizQuestion and Flashcard interfaces to prevent malformed data.

#### Scenario: Quiz content validation
- **WHEN** assistant provides quiz content
- **THEN** system validates against QuizQuestion schema (id, question, correctAnswer, optional choices)
- **AND** validation fails with descriptive error message if structure is invalid

#### Scenario: Flashcard content validation
- **WHEN** assistant provides flashcard content
- **THEN** system validates against Flashcard schema (id, front, back, optional properties)
- **AND** validation fails with descriptive error message if structure is invalid

### Requirement: Promise Completion Synchronization
The system SHALL synchronize tool action Promise with tool UI component completion through ActivityToolProvider context.

#### Scenario: Activity completion resolution
- **WHEN** user completes activity and tool UI calls `resolveActivity(toolCallId, result)`
- **THEN** ActivityToolProvider resolves the pending Promise for that toolCallId
- **AND** assistant receives the activity result as tool output

#### Scenario: First completion only
- **WHEN** user completes activity multiple times or activity is replayed
- **THEN** only the first completion triggers Promise resolution and tool result
- **AND** subsequent completions do not generate additional tool outputs

