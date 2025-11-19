## ADDED Requirements

### Requirement: Activity Tool UI Component
The system SHALL provide a tool UI component that renders activities within the chat interface using existing activity components and the Player wrapper.

#### Scenario: Activity rendering from tool input
- **WHEN** tool UI component receives activity data from tool message part input
- **THEN** system renders appropriate activity (QuizActivity or FlashcardActivity) within Player wrapper
- **AND** activity appears with proper styling, state management, and interactivity

#### Scenario: Readonly activity state
- **WHEN** activity is already completed or is in readonly mode
- **THEN** tool UI displays completion message instead of interactive activity
- **AND** prevents further interaction while showing completed state

### Requirement: ActivityToolProvider Integration
The tool UI component SHALL use ActivityToolProvider context to manage activity completion.

#### Scenario: Activity completion resolution
- **WHEN** user completes activity and result is captured
- **THEN** tool UI calls `resolveActivity(toolCallId, result)` from ActivityToolProvider context
- **AND** Promise is resolved in the client tool for assistant feedback

#### Scenario: Completion state checking
- **WHEN** tool UI renders activity
- **THEN** system checks `isResolved(toolCallId)` to determine if activity should be interactive
- **AND** prevents multiple completions by checking resolved state

### Requirement: Activity Configuration Integration
The tool UI component SHALL pass configuration options from the client tool to the activity components.

#### Scenario: Quiz configuration applied
- **WHEN** tool data includes quiz configuration (requireConfirmation, timeLimit, showFeedback)
- **THEN** tool UI passes these options to QuizActivity component
- **AND** quiz behavior matches the provided configuration

#### Scenario: Flashcard configuration applied
- **WHEN** tool data includes flashcard configuration (shuffle, showHints, trackConfidence)
- **THEN** tool UI passes these options to FlashcardActivity component
- **AND** flashcard behavior matches the provided configuration

### Requirement: Type-Safe Content Handling
The tool UI component SHALL handle activity content with proper type casting and validation.

#### Scenario: Quiz content type casting
- **WHEN** rendering quiz activity
- **THEN** system casts content to QuizQuestion array with proper TypeScript typing
- **AND** ensures data structure matches QuizActivity expectations

#### Scenario: Flashcard content type casting
- **WHEN** rendering flashcard activity
- **THEN** system casts content to Flashcard array with proper TypeScript typing
- **AND** ensures data structure matches FlashcardActivity expectations

### Requirement: Tool Registry Integration
The activity tool UI SHALL be registered in the tool UI system as `createActivity`.

#### Scenario: Tool discovery and rendering
- **WHEN** assistant calls createActivity tool
- **THEN** tool UI system automatically discovers and renders ActivityTool component
- **AND** activity appears in chat interface with proper tool styling