## ADDED Requirements

### Requirement: Core Attempt Entity
The system SHALL provide a core Attempt entity for tracking activity lifecycle with immutable state transitions.

#### Scenario: Create new attempt
- **WHEN** an activity is started
- **THEN** a new Attempt SHALL be created with unique ID, activity metadata, and 'not_started' status

#### Scenario: Transition attempt status
- **WHEN** an attempt progresses through lifecycle
- **THEN** status SHALL transition through valid states: not_started → in_progress → completed/abandoned
- **AND** new Attempt objects SHALL be created for each state change (immutability)

#### Scenario: Store activity metadata
- **WHEN** attempt is created or updated
- **THEN** metadata SHALL be preserved and merged with new information
- **AND** score information SHALL be supported with raw, scaled, and maximum values

### Requirement: Attempt Event Timeline
The system SHALL provide an event timeline for tracking all interactions during an attempt.

#### Scenario: Record lifecycle events
- **WHEN** attempt lifecycle actions occur (start, complete, abandon, pause, resume)
- **THEN** corresponding events SHALL be recorded with auto-generated IDs and timestamps
- **AND** events SHALL be stored in chronological order

#### Scenario: Record custom domain events
- **WHEN** domain-specific interactions occur (quiz answers, hint requests, etc.)
- **THEN** custom events SHALL be recorded with action identifiers and structured data
- **AND** events SHALL support type-safe data payloads

#### Scenario: Prevent events when paused
- **WHEN** attempt is in paused state
- **THEN** new events SHALL be rejected until attempt is resumed

### Requirement: Reactive Store Interface
The system SHALL provide a reactive store interface for managing attempt state and event timeline.

#### Scenario: Subscribe to state changes
- **WHEN** components subscribe to store
- **THEN** they SHALL receive notifications for all state mutations
- **AND** subscription SHALL return unsubscribe function for cleanup

#### Scenario: Validate state transitions
- **WHEN** lifecycle operations are called
- **THEN** store SHALL validate current state and prevent invalid operations
- **AND** descriptive errors SHALL be thrown for validation failures

#### Scenario: Immutable state updates
- **WHEN** state changes occur
- **THEN** new state objects SHALL be created without mutating previous state
- **AND** all subscribers SHALL be notified of the change

### Requirement: Attempt Lifecycle Management
The system SHALL provide complete lifecycle management for attempts with pause/resume capabilities.

#### Scenario: Start new attempt
- **WHEN** start() is called with valid arguments
- **THEN** new attempt SHALL be created with 'in_progress' status
- **AND** start event SHALL be automatically recorded
- **AND** duplicate attempts SHALL be prevented

#### Scenario: Complete attempt
- **WHEN** complete() is called with result data
- **THEN** attempt status SHALL change to 'completed'
- **AND** completion event SHALL be recorded
- **AND** result data SHALL be stored in attempt metadata

#### Scenario: Abandon attempt
- **WHEN** abandon() is called with optional metadata
- **THEN** attempt status SHALL change to 'abandoned'
- **AND** abandon event SHALL be recorded
- **AND** abandonment reason SHALL be captured

#### Scenario: Pause and resume attempts
- **WHEN** pause() is called on in-progress attempt
- **THEN** pause event SHALL be recorded and new events SHALL be blocked
- **WHEN** play() is called on paused attempt
- **THEN** resume event SHALL be recorded and new events SHALL be allowed

### Requirement: Event Factory Pattern
The system SHALL provide event factory utilities for creating type-safe domain events.

#### Scenario: Create lifecycle events
- **WHEN** lifecycle events are needed
- **THEN** ActivityEvent.lifecycle() SHALL create properly structured events
- **AND** valid action types SHALL be enforced (start, complete, abandon, pause, resume)

#### Scenario: Create custom domain events
- **WHEN** domain-specific events are needed
- **THEN** ActivityEvent.custom() SHALL create typed events with data validation
- **AND** action strings SHALL be standardized for consistency

#### Scenario: Create quiz-specific events
- **WHEN** quiz interactions occur
- **THEN** QuizEvent factory SHALL provide answer, timeUp, and requestHint events
- **AND** each event type SHALL have strongly typed data payloads

### Requirement: React Hook Integration
The system SHALL provide React hooks for seamless integration with chat canvas components.

#### Scenario: Access store in React components
- **WHEN** usePlayer hook is called with generic types
- **THEN** it SHALL return current state and store instance
- **AND** SHALL automatically subscribe to state changes
- **AND** SHALL handle subscription cleanup on unmount

#### Scenario: Create domain-specific hooks
- **WHEN** useQuizPlayer hook is used with questions and validation
- **THEN** it SHALL provide quiz-specific methods (validateAnswer, startQuiz, etc.)
- **AND** SHALL derive UI state from store events (score, correctness)
- **AND** SHALL handle complex UI state (selected answers, validation status)

#### Scenario: Reset UI state safely
- **WHEN** reset is called on completed attempts
- **THEN** UI state SHALL be cleared without affecting attempt history
- **AND** new attempt SHALL be able to start cleanly

### Requirement: Chat Canvas Integration
The system SHALL integrate seamlessly with existing chat canvas and streaming architecture.

#### Scenario: Embed activities in chat
- **WHEN** activities are initiated within chat canvas
- **THEN** they SHALL render as interactive components within message threads
- **AND** SHALL maintain chat context during activity lifecycle

#### Scenario: Real-time state synchronization
- **WHEN** activity state changes occur
- **THEN** updates SHALL propagate through existing streaming system
- **AND** chat UI SHALL reflect current activity state immediately

#### Scenario: AI agent activity management
- **WHEN** AI agents initiate activities
- **THEN** they SHALL be able to start, monitor, and complete activities
- **AND** activity results SHALL be available for subsequent conversation context

### Requirement: Type Safety and Validation
The system SHALL provide comprehensive TypeScript support and runtime validation.

#### Scenario: Generic type parameters
- **WHEN** AttemptStore is created with START and COMPLETE types
- **THEN** all methods SHALL be properly typed
- **AND** type inference SHALL work for method arguments

#### Scenario: Runtime validation
- **WHEN** events are created or operations are called
- **THEN** required fields SHALL be validated
- **AND** type errors SHALL be caught early with descriptive messages

#### Scenario: Score calculation
- **WHEN** score data is stored or retrieved
- **THEN** score structure SHALL be enforced (raw, scaled, max)
- **AND** score calculations SHALL be type-safe