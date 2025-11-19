## ADDED Requirements

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