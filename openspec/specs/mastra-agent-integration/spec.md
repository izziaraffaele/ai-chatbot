# mastra-agent-integration Specification

## Purpose
TBD - created by archiving change migrate-to-mastra-agent. Update Purpose after archive.
## Requirements
### Requirement: Chat Agent Configuration
The system SHALL provide a Mastra chat agent configured with system prompt, model selection, and tool calling capabilities matching the existing AI SDK implementation.

#### Scenario: Agent responds to basic chat message
- **WHEN** a user sends a chat message to the Mastra agent
- **THEN** the agent SHALL generate a response using the configured language model
- **AND** the response SHALL be streamed to the client in real-time

#### Scenario: Agent with regular model enables tools
- **WHEN** the agent is configured with a regular chat model (not reasoning)
- **THEN** all 4 tools (getWeather, createDocument, updateDocument, requestSuggestions) SHALL be available
- **AND** the agent SHALL call tools when appropriate based on user messages

#### Scenario: Agent with reasoning model disables tools
- **WHEN** the agent is configured with a reasoning model
- **THEN** tool calling SHALL be disabled
- **AND** the agent SHALL generate responses without tool invocations

### Requirement: Tool Context Injection
The system SHALL provide factory functions that inject session and dataStream context into Mastra tools at runtime.

#### Scenario: Tool receives session context
- **WHEN** a tool is invoked by the agent
- **THEN** the tool SHALL have access to the current user session
- **AND** the tool SHALL validate user permissions using the session

#### Scenario: Tool receives dataStream context
- **WHEN** a tool is invoked by the agent
- **THEN** the tool SHALL have access to the dataStream writer
- **AND** the tool SHALL write real-time updates to the dataStream

#### Scenario: Tool factory creates context-bound tools
- **WHEN** a chat request is initiated with session and dataStream
- **THEN** the factory function SHALL create tool instances with injected context
- **AND** the tools SHALL be registered with the agent for that request

### Requirement: Ported Tools
The system SHALL provide Mastra-compatible versions of all 4 existing AI SDK tools: getWeather, createDocument, updateDocument, and requestSuggestions.

#### Scenario: getWeather tool fetches weather data
- **WHEN** the agent invokes the getWeather tool with a location
- **THEN** the tool SHALL fetch current weather data
- **AND** return formatted weather information to the agent

#### Scenario: createDocument tool creates artifact
- **WHEN** the agent invokes the createDocument tool with title and kind
- **THEN** the tool SHALL generate a new document artifact
- **AND** write document metadata to the dataStream
- **AND** invoke the appropriate document handler for content generation

#### Scenario: updateDocument tool modifies artifact
- **WHEN** the agent invokes the updateDocument tool with document ID and description
- **THEN** the tool SHALL fetch the existing document from the database
- **AND** update the document using the appropriate document handler
- **AND** write update events to the dataStream

#### Scenario: requestSuggestions tool generates edits
- **WHEN** the agent invokes the requestSuggestions tool with a document ID
- **THEN** the tool SHALL fetch the document content
- **AND** generate up to 5 improvement suggestions using the artifact model
- **AND** stream suggestions to the dataStream in real-time
- **AND** save suggestions to the database

### Requirement: System Prompt Configuration
The system SHALL configure the Mastra agent with a system prompt that includes request hints and model-specific instructions.

#### Scenario: System prompt includes geolocation hints
- **WHEN** a chat request includes geolocation data (longitude, latitude, city, country)
- **THEN** the system prompt SHALL include these hints
- **AND** the agent SHALL use location context when responding

#### Scenario: System prompt varies by model
- **WHEN** the agent is configured with a reasoning model
- **THEN** the system prompt SHALL include reasoning-specific instructions
- **WHEN** the agent is configured with a regular model
- **THEN** the system prompt SHALL include tool usage instructions

### Requirement: Usage Tracking Integration
The system SHALL integrate tokenlens usage tracking with Mastra agent responses.

#### Scenario: Token usage is tracked and enriched
- **WHEN** the agent completes a response generation
- **THEN** the system SHALL extract usage data from the Mastra response
- **AND** enrich usage data with tokenlens catalog information
- **AND** write enriched usage to the dataStream as "data-usage" event

#### Scenario: Usage tracking fails gracefully
- **WHEN** tokenlens enrichment fails
- **THEN** the system SHALL log a warning
- **AND** write raw usage data to the dataStream without enrichment
- **AND** continue response processing without errors

### Requirement: Conversation Memory
The system SHALL configure the Mastra agent with memory management using LibSQL storage for within-session context.

#### Scenario: Agent maintains conversation history
- **WHEN** multiple messages are sent within a chat session
- **THEN** the agent SHALL maintain context across messages
- **AND** reference previous messages in its responses

#### Scenario: Agent loads historical messages from database
- **WHEN** a chat request is made for an existing chat
- **THEN** the system SHALL fetch message history from PostgreSQL
- **AND** convert messages to UI format
- **AND** pass message history to the agent for context

#### Scenario: Memory storage is isolated per chat
- **WHEN** multiple chats are active concurrently
- **THEN** each agent instance SHALL maintain separate memory
- **AND** SHALL NOT leak context between different chats

### Requirement: Stream Transformation
The system SHALL transform Mastra agent streams to be compatible with the existing AI SDK stream format used by the client.

#### Scenario: Mastra stream is converted to SSE format
- **WHEN** the agent generates a streaming response
- **THEN** the system SHALL transform the Mastra stream
- **AND** convert events to JSON-to-SSE format
- **AND** return a Response with the transformed stream

#### Scenario: DataStream events are preserved
- **WHEN** tools write events to the dataStream (data-kind, data-id, data-title, etc.)
- **THEN** these events SHALL be included in the transformed stream
- **AND** SHALL be received by the client in the expected format

### Requirement: Agent Registration
The system SHALL register the chat agent in the Mastra instance and export it for use by route handlers.

#### Scenario: Chat agent is available in Mastra instance
- **WHEN** the Mastra instance is initialized
- **THEN** the chat agent SHALL be registered in the agents object
- **AND** SHALL be accessible via `mastra.agents.chatAgent`

#### Scenario: Chat agent can be imported directly
- **WHEN** a module needs to use the chat agent
- **THEN** the agent SHALL be exportable from the mastra module
- **AND** SHALL be importable via `import { chatAgent } from '@/mastra'`

### Requirement: Error Handling
The system SHALL handle Mastra agent errors and map them to appropriate error responses.

#### Scenario: Tool execution error is handled
- **WHEN** a tool throws an error during execution
- **THEN** the agent SHALL catch the error
- **AND** return an error message to the user
- **AND** log the error for debugging

#### Scenario: Stream interruption is handled
- **WHEN** the stream is interrupted before completion
- **THEN** the system SHALL handle the interruption gracefully
- **AND** save partial messages to the database
- **AND** return appropriate error response to the client

#### Scenario: Model API error is handled
- **WHEN** the underlying language model API fails
- **THEN** the system SHALL catch the error
- **AND** return a user-friendly error message
- **AND** log the error with request context

### Requirement: Type Safety
The system SHALL provide TypeScript type definitions for all Mastra agent interfaces, tools, and responses.

#### Scenario: Tool definitions are type-safe
- **WHEN** defining a new Mastra tool
- **THEN** the tool parameters SHALL be validated with Zod schemas
- **AND** TypeScript SHALL enforce correct parameter types

#### Scenario: Agent responses are typed
- **WHEN** the agent generates a response
- **THEN** the response SHALL have proper TypeScript types
- **AND** TypeScript SHALL enforce correct usage of response properties

#### Scenario: Context injection is type-safe
- **WHEN** creating tools with context injection
- **THEN** TypeScript SHALL enforce correct session and dataStream types
- **AND** SHALL prevent tools from being created without required context

### Requirement: Artifact Generation with Mastra Agents
The system SHALL provide Mastra agents for generating document artifacts (text, code, sheet) with unified text streaming to the dataStream.

#### Scenario: Internal agent created for artifact generation
- **WHEN** a document handler is created for a specific artifact kind
- **THEN** an internal Mastra document expert agent SHALL be instantiated
- **AND** the agent SHALL be configured with document-type-specific system prompts
- **AND** the agent SHALL use a language model specified in handler config or default to 'artifact-model'
- **AND** the agent SHALL be passed to the onCreateDocument and onUpdateDocument callbacks

#### Scenario: Unified textStream for all artifact types
- **WHEN** creating any artifact (text, code, or sheet)
- **THEN** the handler SHALL call agent.stream() with the document description or specifications
- **AND** iterate through agent.stream().textStream using for-await to receive streaming text chunks
- **AND** for each chunk, emit dataStream.write({ type: 'data-[kind]Delta', data: chunk, transient: true })
- **AND** accumulate chunks into draftContent variable
- **AND** return the complete aggregated text content

#### Scenario: Text artifact text generation
- **WHEN** creating a text document
- **THEN** the handler SHALL use agent.stream().textStream to stream narrative text
- **AND** emit dataStream.write({ type: 'data-textDelta', data: chunk, transient: true }) for each chunk
- **AND** return the final narrative text

#### Scenario: Code artifact text generation
- **WHEN** creating a code document
- **THEN** the handler SHALL use agent.stream().textStream to stream code as text
- **AND** emit dataStream.write({ type: 'data-codeDelta', data: chunk, transient: true }) for each code chunk
- **AND** return the complete code as text

#### Scenario: Sheet artifact CSV text generation
- **WHEN** creating a sheet document
- **THEN** the handler SHALL use agent.stream().textStream to stream CSV data as text
- **AND** emit dataStream.write({ type: 'data-sheetDelta', data: chunk, transient: true }) for each CSV chunk
- **AND** return the complete CSV content as text

#### Scenario: Document update uses same agent streaming
- **WHEN** updating an existing document
- **THEN** the handler SHALL use the same agent.stream().textStream approach as document creation
- **AND** invoke agent.stream() with the update description and existing content context
- **AND** stream text deltas to dataStream consistent with creation
- **AND** return the updated document content

#### Scenario: Model selection is configurable per handler
- **WHEN** creating a document handler with a model parameter
- **THEN** the handler config SHALL accept optional `model?: string` parameter
- **AND** the internal agent SHALL use the specified model
- **AND** if no model is provided, the agent SHALL default to 'artifact-model'
- **AND** this allows per-artifact-type model optimization

#### Scenario: Agent configuration is document-type-specific
- **WHEN** an artifact handler is created
- **THEN** the internal agent SHALL be configured with a specialized system prompt
- **AND** text agents SHALL have prompts optimized for narrative content
- **AND** code agents SHALL have prompts optimized for syntax-valid code generation
- **AND** sheet agents SHALL have prompts optimized for CSV generation
- **AND** prompts are responsible for output validation (no Zod schemas)

### Requirement: Artifact Agent Error Handling
The system SHALL handle errors during artifact agent stream consumption gracefully.

#### Scenario: Stream consumption error is caught and logged
- **WHEN** an error occurs while iterating through agent.stream()
- **THEN** the handler SHALL catch the error
- **AND** log the error with document context (id, title, kind)
- **AND** return partial content if available, or empty string if no content generated
- **AND** the error SHALL NOT crash the chat endpoint

#### Scenario: Agent response validation
- **WHEN** consuming chunks from agent.stream()
- **THEN** the handler SHALL validate that chunks conform to expected types
- **AND** skip or log invalid chunks without interrupting the stream
- **AND** ensure that partial invalid data does not corrupt the final document

### Requirement: Streaming Performance
The system SHALL maintain efficient streaming of artifact generation without unnecessary delays.

#### Scenario: Datastream events emitted in real-time
- **WHEN** consuming agent stream chunks
- **THEN** dataStream.write() calls SHALL be awaited in sequence
- **AND** deltas SHALL be emitted as they arrive from the agent stream
- **AND** the client SHALL receive updates incrementally for responsive UI

#### Scenario: Stream iteration handles async operations
- **WHEN** iterating through agent.stream() using for-await loops
- **THEN** the handler SHALL properly await async operations
- **AND** maintain correct order of dataStream writes
- **AND** ensure all chunks are processed before returning final content

