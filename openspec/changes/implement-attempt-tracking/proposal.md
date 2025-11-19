# Change: Implement Core Attempt Tracking System

## Why
Add a reusable, in-memory attempt tracking system for managing dynamic AI chat experiences and interactive activities that play within the chat canvas. This addresses the need for lifecycle management, event tracking, and state persistence during interactive AI-driven activities like quizzes, assessments, and guided workflows that users engage with directly in the chat interface.

## What Changes

### Core Architecture
- Add core attempt tracking entities (`Attempt`, `AttemptEvent`, `AttemptState`) with factory patterns
- Implement reactive `AttemptStore` class with observer pattern for state management
- Create direct store interface without persistence adapter layer complexity
- Add generic type support for different activity start/complete arguments

### React Integration
- Add `usePlayer` hook for React integration with store state subscription
- Create domain-specific hooks like `useQuizPlayer` for specific activity types
- Integrate with existing chat canvas components for seamless UI experience
- Connect to existing streaming architecture for real-time activity updates

### Activity Structure Patterns
- **Standardized folder structure**: `index.tsx`, `player.tsx`, `components.tsx` for each activity
- **Provider pattern**: `use[Activity]Player(config)` wrapped in `[Activity]Provider`
- **Context pattern**: `use[Activity]Context()` returning `{ [activity]: ... }`
- **Component composition**: Main activity with welcome/end screens and standalone variants
- **Event system**: Domain-specific event factories (`[Activity]Event`) with proper action format
- **Type safety**: Complete TypeScript definitions for all activity components
- **UI primitives**: Compound component patterns for reusable activity UI elements

### Event System
- Implement event factory patterns for domain-specific tracking (`QuizEvent`, etc.)
- Add score calculation and metadata support for AI-driven activities
- Create lifecycle event tracking (start, complete, abandon, pause, resume)
- Support custom domain events for interactive activities

### Chat Canvas Integration
- Integrate with existing streaming architecture for real-time updates
- Connect to AI Elements component system for consistent chat UI
- Add support for activity state persistence during chat sessions
- Enable AI agents to initiate and manage interactive activities

## Impact

### New Capability
- **activity-tracking**: Core attempt tracking system for interactive AI experiences

### Affected Code Areas
- **New `lib/activity-tracking/` module**:
  - Core entities: `Attempt`, `AttemptEvent`, `AttemptState`
  - `AttemptStore` class with reactive state management
  - Event factory utilities for domain-specific tracking
  - Type definitions and interfaces

- **React hooks in `hooks/`**:
  - `usePlayer` generic hook for store integration
  - Domain-specific hooks (e.g., `useQuizPlayer`)
  - Activity lifecycle management helpers

- **Activity components in `components/activities/`**:
  - Standardized activity structure with `index.tsx`, `player.tsx`, `components.tsx`
  - Domain-specific providers and context hooks
  - Compound component patterns for UI primitives
  - Welcome/end screens and standalone variants
  - Event factory integration for activity tracking

- **Chat canvas components in `components/chat/`**:
  - Integration with existing chat primitives
  - Activity rendering within chat threads
  - State management for interactive elements

- **Integration with existing systems**:
  - `lib/ai/` - Connect to streaming architecture for real-time updates
  - `components/chat/` - Integration with chat canvas and AI Elements
  - `lib/types.ts` - Centralized type definitions
  - Existing message and artifact systems for activity persistence

### Technical Benefits
- **Simplified Architecture**: Direct store approach without persistence adapter complexity
- **Type Safety**: Full TypeScript support with generic start/complete arguments
- **Reactive Updates**: Observer pattern for real-time state synchronization
- **Domain Extensibility**: Event factory patterns for different activity types
- **Chat Integration**: Seamless embedding within existing chat canvas experience
- **AI Agent Compatibility**: Enables AI agents to launch and manage interactive experiences
- **DX-Friendly Patterns**: Standardized activity structure ensures consistency and developer experience
- **Composable Components**: Compound component patterns for flexible UI construction
- **Internationalization Support**: Built-in translation system integration for all activities