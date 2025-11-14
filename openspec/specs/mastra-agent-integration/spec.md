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

### Requirement: Research Agent Configuration
The system SHALL provide a Mastra research agent configured with Google search capability, system prompt for report synthesis, and memory management for multi-turn research workflows.

#### Scenario: Research agent is available in agent network
- **WHEN** the Mastra instance is initialized
- **THEN** the research agent SHALL be registered in the agents object
- **AND** SHALL be accessible via `mastra.agents.researchAgent`
- **AND** SHALL be importable via `import { researchAgent } from '@/mastra'`

#### Scenario: Research agent executes web search
- **WHEN** a caller invokes the research agent with a query
- **THEN** the agent SHALL use the Google search tool to find relevant web results
- **AND** the agent SHALL translate the query into effective search terms if needed
- **AND** the agent SHALL execute one or more searches to gather comprehensive information
- **AND** the agent SHALL synthesize search results into a structured report

#### Scenario: Research agent generates synthesis report
- **WHEN** search results are collected
- **THEN** the agent SHALL synthesize results into a coherent narrative report
- **AND** the report SHALL acknowledge sources and limitations
- **AND** the report SHALL be streamed to the caller for real-time feedback
- **AND** the agent SHALL NOT hallucinate or invent search results

#### Scenario: Research agent maintains context across queries
- **WHEN** multiple search queries are submitted to the same agent instance
- **THEN** the agent SHALL maintain conversation history using memory storage
- **AND** the agent SHALL reference previous search results when relevant
- **AND** the agent SHALL avoid redundant searches for the same topic
- **AND** memory SHALL be isolated per research session

#### Scenario: Research agent uses configurable model
- **WHEN** the research agent is instantiated
- **THEN** the model SHALL be configurable at runtime
- **AND** SHALL default to `google/gemini-2.5-flash` or a semantically equivalent Google model
- **AND** the model override SHALL be passed at agent invocation time
- **AND** allows experimenting with different model variants (e.g., Pro for complex research)

#### Scenario: Research agent handles search failures gracefully
- **WHEN** the Google search tool fails or returns no results
- **THEN** the agent SHALL catch the error
- **AND** return a clear message to the caller
- **AND** log the error for debugging
- **AND** NOT crash the calling workflow

### Requirement: Research Agent System Prompt
The system SHALL configure the research agent with specialized instructions optimized for web search and report synthesis.

#### Scenario: System prompt is research-optimized
- **WHEN** the research agent is initialized
- **THEN** the system prompt SHALL include instructions for:
  - Crafting effective search queries from user input
  - Synthesizing multiple search results into coherent reports
  - Acknowledging sources and limitations
  - Avoiding hallucinated information
  - Knowing when to execute additional searches vs. synthesizing current results

#### Scenario: System prompt prevents hallucination
- **WHEN** the agent generates a report
- **THEN** the prompt SHALL explicitly forbid making up search results
- **AND** the prompt SHALL require the agent to only use actual search results
- **AND** the prompt SHALL instruct the agent to explicitly state when information is unavailable

### Requirement: Research Agent in Agent Network
The system SHALL register the research agent in the Mastra instance and export it for use by other agents and workflows.

#### Scenario: Research agent is registered alongside chat agent
- **WHEN** `mastra/agents/index.ts` is loaded
- **THEN** both `chatAgent` and `researchAgent` SHALL be exported
- **AND** both SHALL be registered in `mastraAgents` object
- **AND** both SHALL be referenced in `AGENT_NAMES` enum

#### Scenario: Research agent can be used in agent networks
- **WHEN** building multi-agent workflows or agent networks
- **THEN** the research agent SHALL be available as a callable component
- **AND** other agents SHALL be able to delegate research tasks to it
- **AND** the research agent SHALL return structured research reports for downstream processing

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

