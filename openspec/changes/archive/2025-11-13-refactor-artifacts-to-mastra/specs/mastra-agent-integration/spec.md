## MODIFIED Requirements

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

## ADDED Requirements

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
