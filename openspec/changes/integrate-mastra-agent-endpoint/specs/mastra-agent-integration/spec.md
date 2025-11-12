# Mastra Agent Integration Specification - Phase 2

## MODIFIED Requirements

### Requirement: Chat Endpoint Migration
The system SHALL replace the Vercel AI SDK `streamText()` implementation in `/app/(chat)/api/chat/route.ts` with Mastra `agent.stream(format: "aisdk")` while maintaining 100% backward compatibility with the existing frontend.

#### Scenario: Chat endpoint replaces AI SDK with Mastra
- **WHEN** a POST request is received at `/api/chat` with messages
- **THEN** the endpoint SHALL invoke the Mastra chat agent via `agent.stream()`
- **AND** the response SHALL be streamed in AI SDK-compatible format
- **AND** the frontend SHALL receive identical stream format as before

#### Scenario: Stream format compatibility
- **WHEN** the Mastra agent streams a response
- **THEN** the stream format with `format: "aisdk"` SHALL be compatible with `useChat()` hook
- **AND** `.toUIMessageStreamResponse()` SHALL convert to proper SSE format
- **AND** the client SHALL parse messages without modifications

### Requirement: Tool Context Injection
The system SHALL inject session and chat context into Mastra tools using `createToolContext` from `@mastra/utils/runtime-utils.ts`.

#### Scenario: createToolContext provides session to tools
- **WHEN** a chat request is initiated with user session
- **THEN** `createToolContext` SHALL be used to create tool context
- **AND** tools SHALL access session via `context` parameter in execute()
- **AND** tools SHALL use session for authorization checks

#### Scenario: Tool receives chat metadata
- **WHEN** a tool is invoked during agent execution
- **THEN** the tool SHALL receive chatId and userId from injected context
- **AND** the tool SHALL use metadata for message persistence and logging
- **AND** the tool execution SHALL complete with full context access

#### Scenario: Geolocation context available to agent
- **WHEN** geolocation data is available in the request
- **THEN** the geolocation SHALL be included in tool context
- **AND** the agent's system prompt SHALL use geolocation for location-aware responses

### Requirement: Tool Streaming via Mastra Native Support
The system SHALL leverage Mastra's native tool streaming via `writer.custom()` for real-time tool events.

#### Scenario: Tool emits custom events natively
- **WHEN** a tool executes during agent generation
- **THEN** the tool MAY emit custom events via `writer?.custom()`
- **AND** Mastra's AI SDK format conversion SHALL handle events automatically
- **AND** the client SHALL receive tool events in expected format

### Requirement: tokenlens Integration in Endpoint
The system SHALL extract token usage from Mastra responses and enrich with tokenlens catalog.

#### Scenario: Usage tracking enriched with tokenlens
- **WHEN** the Mastra agent completes response generation
- **THEN** the system SHALL extract `usage` from response metadata
- **AND** tokenlens catalog SHALL enrich usage data
- **AND** enriched usage SHALL be written to stream as data-usage event

#### Scenario: Usage enrichment failure handled gracefully
- **WHEN** tokenlens enrichment fails
- **THEN** raw usage data SHALL be written to stream
- **AND** the stream SHALL continue without interruption
- **AND** error SHALL be logged for debugging

### Requirement: Message Persistence Compatibility
The system SHALL save Mastra agent responses to the database in the same format as AI SDK responses (no conversion needed).

#### Scenario: Message saved with identical format
- **WHEN** a chat response is generated via Mastra agent
- **THEN** the message SHALL be saved to `Message_v2` table
- **AND** the message format (parts, attachments) SHALL match AI SDK format exactly
- **AND** existing message retrieval and conversion logic SHALL work unchanged

### Requirement: Error Handling & Graceful Degradation
The system SHALL catch Mastra agent errors, log with context, and return client-friendly error messages.

#### Scenario: Tool execution error handled
- **WHEN** a tool throws an error during execution
- **THEN** the agent SHALL catch the error gracefully
- **AND** an error message SHALL be returned to the client
- **AND** the error SHALL be logged with chatId, userId, and error details

#### Scenario: Stream interruption handled
- **WHEN** the stream is interrupted before completion
- **THEN** partial messages MAY be saved to database
- **AND** the client SHALL receive an error response
- **AND** the error SHALL be logged with context

#### Scenario: Model API error handled
- **WHEN** the underlying language model API fails
- **THEN** the system SHALL catch the error
- **AND** a user-friendly error message SHALL be returned
- **AND** the error SHALL be logged with request context

### Requirement: Session Context from Next.js auth()
The system SHALL extract user session from Next.js `auth()` helper and make it available to the agent and tools.

#### Scenario: Session extracted and passed to agent
- **WHEN** a chat request is received
- **THEN** the system SHALL call `auth()` to get user session
- **AND** the session SHALL be included in tool context
- **AND** tools SHALL access session for authorization and logging

### Requirement: Chat Context Persistence
The system SHALL extract chat ID and user ID from the request and maintain them through the streaming flow for proper message association.

#### Scenario: Chat metadata associated with streamed response
- **WHEN** a message is streamed from the agent
- **THEN** the chatId and userId from the request SHALL be preserved
- **AND** after streaming completes, the message SHALL be saved with correct association
- **AND** future message retrieval by chat SHALL work correctly

