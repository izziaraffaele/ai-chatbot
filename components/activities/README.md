# Activities System

Comprehensive framework for creating interactive experiences within the AI chatbot application. This system provides DX-friendly, type-safe patterns for implementing activities like quizzes, flashcards, and more that integrate seamlessly with the chat canvas.

## Overview

Activities are interactive components that integrate with the core activity tracking system to provide state management, event tracking, and lifecycle control. Each activity follows standardized patterns that ensure consistency and excellent developer experience.

The system consists of:

- **Core Activity Tracking** - Reactive state management and event timeline
- **Standardized Architecture** - Consistent patterns for all activities
- **React Integration** - Hooks and providers for seamless chat canvas integration
- **Type Safety** - Comprehensive TypeScript support
- **Internationalization** - Built-in multi-language support

## Quick Start

### Basic Activity Usage

```typescript
import { createAttemptStore } from '@/lib/activity-tracking';
import { Player } from '@/components/activities/player';

// Create a store for your activity
const store = createAttemptStore('quiz-123', 'quiz');

// Wrap your activity with Player for React integration
function MyActivity() {
  return (
    <Player store={store}>
      <QuizActivity
        questions={quizQuestions}
        title="Math Quiz"
      />
    </Player>
  );
}
```

### Using Existing Activities

```typescript
import { QuizActivity } from '@/components/activities/quiz';
import { FlashcardActivity } from '@/components/activities/flashcards';

function ChatMessageWithQuiz() {
  return (
    <div className="chat-message">
      <p>Let's test your knowledge!</p>
      <QuizActivity
        questions={[
          {
            id: 'q1',
            question: 'What is 2+2?',
            correctAnswer: 4,
            choices: [
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' }
            ]
          }
        ]}
        title="Quick Math Quiz"
      />
    </div>
  );
}
```

## Architecture Overview

### Core Activity Tracking System

The activity system is built on top of the core framework located in `@/lib/activity-tracking/`:

- **AttemptStore**: Manages activity state and events with reactive updates
- **Player Context**: Provides generic state management wrapper
- **Event System**: Type-safe event creation and tracking
- **Lifecycle Management**: Start, pause, complete, abandon functionality

### Key Concepts

#### Attempt

Represents a single activity attempt with lifecycle state:

```typescript
type Attempt = {
  id: string;
  activityId: string;
  activityType: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  passed: boolean;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  lastActivityAt?: Date;
  metadata: Record<string, unknown>;
  score?: AttemptScore;
};
```

#### Event Timeline

Events capture all interactions during an attempt:

```typescript
type AttemptEvent = {
  id: string;
  action: string;          // e.g., 'quiz.answer', 'activity.start'
  createdAt: Date;
  data: Record<string, unknown>;
};
```

#### Store State

Reactive state container with subscription-based updates:

```typescript
type AttemptState = {
  currentAttempt: Attempt | null;
  events: AttemptEvent[];
};
```

## Standardized Activity Structure

### Folder Organization

Each activity must follow this exact folder structure:

```
components/activities/[activity-name]/
├── index.tsx          # Main activity component and composition
├── player.tsx         # Context, hooks, types, and events
└── components.tsx     # UI primitives and compound components
```

### File Responsibilities

#### `index.tsx` - Activity Composition

- **Purpose**: Main activity component that orchestrates the entire experience
- **Exports**:
  - Primary activity component (e.g., `QuizActivity`, `FlashcardActivity`)
  - Standalone screen components (e.g., `QuizActivityWelcome`, `QuizActivityEnd`)
  - Empty state component (e.g., `QuizActivityEmpty`)
- **Responsibilities**:
  - Provider setup and configuration
  - Screen management (welcome → activity → end)
  - Activity-specific UI composition
  - Integration with activity tracking store

#### `player.tsx` - Core Logic & State Management

- **Purpose**: Domain-specific logic, state management, and activity tracking integration
- **Exports**:
  - `use[Activity]Player(config)` - Core hook containing all activity logic
  - `use[Activity]Context()` - Context access hook
  - `[Activity]Provider` - React context provider
  - Type definitions and interfaces
  - Event factory (e.g., `QuizEvent`, `FlashcardEvent`)
- **Responsibilities**:
  - Activity state management
  - Event handling and tracking
  - Business logic implementation
  - Integration with core activity tracking

#### `components.tsx` - UI Primitives

- **Purpose**: Reusable UI components following compound component pattern
- **Exports**:
  - Compound component (e.g., `Quiz`, `Flashcard`)
  - Sub-components (e.g., `Quiz.Question`, `Flashcard.Front`, `Flashcard.Back`)
- **Responsibilities**:
  - UI rendering and interactions
  - Animation and visual effects
  - Accessibility features
  - Design system integration

## Provider and Hook Patterns

### Standard Provider Pattern

Every activity must implement this exact provider pattern:

```typescript
// player.tsx
export function [Activity]Provider({
  children,
  config,
}: React.PropsWithChildren<{
  config: [Activity]PlayerConfig;
}>) {
  const activity = use[Activity]Player(config);

  return (
    <[Activity]Context.Provider value={{ activity }}>
      {children}
    </[Activity]Context.Provider>
  );
}
```

### Standard Hook Pattern

The core hook must follow this structure:

```typescript
// player.tsx
export function use[Activity]Player(
  config: [Activity]PlayerConfig
): Use[Activity]PlayerReturn {
  // Core activity tracking integration
  const { state, store } = usePlayer<[Activity]StartArgs, [Activity]CompleteArgs>();

  // Activity-specific state and logic
  // ...

  return {
    state,
    store,
    // Activity-specific properties
    current[X]: ..., // Current item/question/card
    currentIndex: ..., // Current index
    [activity]SpecificData: ...,
    handlers: {
      start: async () => { /* ... */ },
      [action]: async () => { /* ... */ },
      cancel: async () => { /* ... */ },
      restart: async () => { /* ... */ },
    },
    screen: "welcome" | "[activity]" | "end",
    config,
  };
}
```

### Context Access Pattern

Context must follow this exact pattern:

```typescript
// player.tsx
export function use[Activity]Context(): [Activity]ContextValue {
  const context = useContext([Activity]Context);
  if (!context) {
    throw new Error(`use[Activity]Context must be used within a [Activity]Provider`);
  }
  return context;
}

// Context type must return { [activity]: ... }
export type [Activity]ContextValue = {
  [activity]: Use[Activity]PlayerReturn;
};
```

## Component Composition Patterns

### Main Activity Component Structure

```typescript
// index.tsx
export function [Activity]Activity(props: [Activity]ActivityProps) {
  const config: [Activity]PlayerConfig = {
    // Configuration from props
  };

  return (
    <[Activity]Provider config={config}>
      <[Activity]ActivityContent
        // Additional props
      />
    </[Activity]Provider>
  );
}
```

### Content Component Structure

The internal content component handles screen management:

```typescript
function [Activity]ActivityContent({
  // Props
}) {
  const { [activity] } = use[Activity]Context();

  // Welcome screen
  if ([activity].screen === "welcome") {
    return <[Activity]WelcomeScreen /* ... */ />;
  }

  // End screen
  if ([activity].screen === "end") {
    return <[Activity]EndScreen /* ... */ />;
  }

  // Main activity
  if ([activity].current[X]) {
    return (
      <div className="[activity]-content space-y-6">
        {/* Activity UI */}
      </div>
    );
  }

  return <[Activity]Empty description="No items available" />;
}
```

### Standalone Screen Components

Export standalone components for flexibility:

```typescript
// Standalone welcome screen
export function [Activity]Welcome(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  [items]: [ItemType][];
  onStart: () => void;
  onCancel: () => void;
}) {
  return <[Activity]WelcomeScreen /* ... */ />;
}

// Standalone end screen
export function [Activity]End(props: {
  total[Items]: number;
  stats: StatsType;
  onRestart: () => void;
  onFeedback?: (value: number) => void;
}) {
  return <[Activity]EndScreen /* ... */ />;
}
```

## Event System Integration

### Event Factory Pattern

Each activity must export an event factory:

```typescript
// player.tsx
export const [Activity]Event = {
  [eventName]: (data: [EventType]) => ({
    action: "[activity].[event_name]" as const,
    data,
  }),
  // Additional events...
};
```

### Event Integration in Handlers

```typescript
const [action] = useCallback(async () => {
  // Business logic
  await store.sendEvent(
    [Activity]Event.[eventName]({
      // Event data
    })
  );
  // UI state updates
}, [store, /* dependencies */]);
```

### Generic Event Factory

Use the generic event factory for lifecycle events:

```typescript
import { ActivityEvent } from '@/lib/activity-tracking';

// Lifecycle events
ActivityEvent.lifecycle('activity.start');
ActivityEvent.lifecycle('activity.complete');

// Custom events with typed data
ActivityEvent.custom('my.action', { userId: '123', value: 42 });
```

## TypeScript Type Definitions

### Standard Type Structure

```typescript
// player.tsx
export type [Activity]StartArgs = {
  // Start-specific arguments
  metadata?: Record<string, unknown>;
};

export type [Activity]CompleteArgs = {
  // Completion-specific arguments
  metadata?: Record<string, unknown>;
};

export type [Activity]PlayerConfig = {
  // Configuration options
  defaultScreen?: "welcome" | "[activity]";
  // Additional config...
};

export type Use[Activity]PlayerReturn = {
  /** Current state from Player */
  state: AttemptState;
  /** Store instance from Player */
  store: AttemptStore<[Activity]StartArgs, [Activity]CompleteArgs>;
  /** Current item */
  current[X]: [ItemType] | null;
  /** Current index */
  currentIndex: number;
  /** Activity-specific data */
  // ...
  /** Event handlers */
  handlers: {
    start: () => Promise<void>;
    // Activity-specific handlers
    cancel: () => Promise<void>;
    restart: () => Promise<void>;
  };
  /** Current screen */
  screen: "welcome" | "[activity]" | "end";
  /** Activity configuration */
  config: [Activity]PlayerConfig;
};
```

## UI Components Pattern

### Compound Component Structure

```typescript
// components.tsx
export const [Activity] = Object.assign([Activity]Root, {
  [SubComponent1]: [Activity][SubComponent1],
  [SubComponent2]: [Activity][SubComponent2],
  // Additional sub-components...
});
```

### Component Naming Conventions

- Use descriptive, action-oriented names
- Follow established patterns: `Question`, `Choice`, `Flashcard`, `Card`
- Maintain consistency with activity domain

## Integration with Core Systems

### Store Integration

Activities must integrate with the core `AttemptStore`:

```typescript
const { state, store } = usePlayer<[Activity]StartArgs, [Activity]CompleteArgs>();

// Lifecycle management
await store.start({ /* start args */ });
await store.complete({ /* complete args */ });
await store.abandon();
```

### Player Component Wrapper

Activities should be wrapped in the generic `Player` component:

```tsx
<Player store={createAttemptStore('[activity]-id', '[activity]')}>
  <[Activity]Activity /* props */ />
</Player>
```

### Chat Canvas Integration

The activity tracking system integrates seamlessly with the chat canvas:

```tsx
// In a chat message component
function ChatMessageWithActivity() {
  return (
    <div className="chat-message">
      <p>Let's test your knowledge!</p>
      <QuizPlayer questions={quizQuestions} />
    </div>
  );
}
```

## Internationalization

### Translation Keys

Follow the established translation key pattern:

```typescript
// lib/i18n/translations/en.ts
"[activity].welcome.title": "Start [Activity]",
"[activity].welcome.start": "Start",
"[activity].welcome.cancel": "Cancel",
"[activity].completed.title": "[Activity] Complete!",
"[activity].feedback.prompt": "How was this [activity]?",
"[activity].feedback.restart": "Try Again",
```

### Translation Usage

```typescript
// components
const t = useTranslations();

return (
  <button>
    {t("[activity].welcome.start", t("common.start", "Start"))}
  </button>
);
```

## Existing Activities

### Quiz Activity

A complete quiz implementation demonstrating the standardized patterns:

```typescript
import { QuizActivity } from '@/components/activities/quiz';

<QuizActivity
  questions={[
    {
      id: 'q1',
      question: 'What is 2+2?',
      correctAnswer: 4,
      choices: [
        { value: 3, label: '3' },
        { value: 4, label: '4' },
        { value: 5, label: '5' }
      ]
    }
  ]}
  title="Math Quiz"
  requireConfirm
/>
```

**Features:**
- Welcome and completion screens
- Question navigation and validation
- Score tracking and statistics
- Confidence rating support
- Full internationalization

### Flashcard Activity

A complete flashcard study implementation:

```typescript
import { FlashcardActivity } from '@/components/activities/flashcards';

<FlashcardActivity
  cards={[
    {
      id: 'f1',
      front: 'Hola',
      back: 'Hello',
      hint: 'Common greeting in Spanish'
    }
  ]}
  title="Spanish Vocabulary"
  shuffle
  options={{
    trackConfidence: true,
    showHints: true
  }}
/>
```

**Features:**
- Card flipping animations (flip, slide, fade)
- Progress tracking and shuffle options
- Confidence rating (low/medium/high)
- Study session statistics
- Hint support

## API Reference

### AttemptStore

Core store class for managing activity lifecycle.

#### Constructor

```typescript
new AttemptStore<START, COMPLETE>(activityId: string, activityType: string)
```

#### Methods

##### `start(args?: START): Promise<Attempt>`
Start a new attempt for the activity.

```typescript
await store.start({
  sessionId: 'user-123',
  metadata: { difficulty: 'hard' }
});
```

##### `complete(args?: COMPLETE): Promise<Attempt>`
Complete the current attempt.

```typescript
await store.complete({
  score: 85,
  totalQuestions: 10,
  metadata: { timeSpent: 300 }
});
```

##### `abandon(args?: { metadata?: Record<string, unknown> }): Promise<Attempt>`
Abandon the current attempt.

```typescript
await store.abandon({
  metadata: { reason: 'user_canceled' }
});
```

##### `sendEvent(event: Omit<AttemptEvent, 'id' | 'createdAt'>): Promise<void>`
Send an event to the timeline.

```typescript
await store.sendEvent({
  action: 'quiz.answer',
  data: {
    questionId: 'q1',
    answer: 'A',
    isCorrect: true
  }
});
```

##### `pause(): Promise<void>` & `play(): Promise<void>`
Pause/resume event recording.

```typescript
await store.pause();  // Events will be ignored
await store.play();   // Resume event recording
```

##### `getState(): AttemptState`
Get current store state.

##### `subscribe(listener: () => void): () => void`
Subscribe to state changes. Returns unsubscribe function.

##### `reset(): void`
Reset store state (only allowed when not in progress).

### React Hooks

#### `usePlayer<START, COMPLETE>()`

Generic hook for accessing store state and operations.

```typescript
const { state, store } = usePlayer<QuizStartArgs, QuizCompleteArgs>();

// state.currentAttempt - Current attempt if any
// state.events - Timeline of events
// store - Store instance for operations
```

#### Store Creation

Create stores using the factory function:

```typescript
import { createAttemptStore } from '@/lib/activity-tracking';

const store = createAttemptStore<QuizStartArgs, QuizCompleteArgs>('quiz-123', 'quiz');
```

## Best Practices

### Performance
- Use `useCallback` for event handlers
- Use `useMemo` for expensive calculations
- Minimize re-renders through proper dependency arrays
- The store uses efficient subscription management and immutable updates

### Accessibility
- Include proper ARIA labels and roles
- Support keyboard navigation
- Pair mouse events with keyboard equivalents

### Error Handling
- Wrap async operations in try-catch blocks
- Provide meaningful error messages
- Handle edge cases gracefully

### Type Safety
- Use generic types for type-safe operations
- Define strict interfaces for start/complete arguments
- Leverage TypeScript for event data validation

### Testing
- Export components for testing
- Use consistent prop interfaces
- Implement proper loading and error states

## Creating New Activities

### Implementation Checklist

When creating a new activity, ensure you have:

- [ ] Folder structure: `index.tsx`, `player.tsx`, `components.tsx`
- [ ] Provider: `[Activity]Provider` wrapping `use[Activity]Player(config)`
- [ ] Context: `use[Activity]Context()` returning `{ [activity]: ... }`
- [ ] Event factory: `[Activity]Event` with proper action format
- [ ] Main activity: `[Activity]Activity` with provider setup
- [ ] Screen management: welcome, activity, end screens
- [ ] Standalone components: Welcome, End, Empty variants
- [ ] Translation keys: Added to both `en.ts` and `it.ts`
- [ ] TypeScript types: Complete type definitions
- [ ] Compound components: UI primitives in `components.tsx`
- [ ] Store integration: Proper lifecycle management
- [ ] Error handling: Robust async operation handling

### Step-by-Step Guide

1. **Create folder structure**:
   ```bash
   mkdir components/activities/my-activity
   touch components/activities/my-activity/{index.tsx,player.tsx,components.tsx}
   ```

2. **Define types** in `player.tsx`:
   ```typescript
   export type MyActivityStartArgs = {
     metadata?: Record<string, unknown>;
   };

   export type MyActivityCompleteArgs = {
     score: number;
     totalItems: number;
     metadata?: Record<string, unknown>;
   };
   ```

3. **Create event factory** in `player.tsx`:
   ```typescript
   export const MyActivityEvent = {
     itemCompleted: (data: MyActivityItemEventData) => ({
       action: "myactivity.item.completed" as const,
       data,
     }),
   };
   ```

4. **Implement hook** in `player.tsx`:
   ```typescript
   export function useMyActivityPlayer(
     config: MyActivityPlayerConfig
   ): UseMyActivityPlayerReturn {
     const { state, store } = usePlayer<MyActivityStartArgs, MyActivityCompleteArgs>();
     // Implement activity-specific logic
   }
   ```

5. **Create provider** in `player.tsx`:
   ```typescript
   export function MyActivityProvider({
     children,
     config,
   }: React.PropsWithChildren<{
     config: MyActivityPlayerConfig;
   }>) {
     const activity = useMyActivityPlayer(config);
     return (
       <MyActivityContext.Provider value={{ activity }}>
         {children}
       </MyActivityContext.Provider>
     );
   }
   ```

6. **Build UI components** in `components.tsx`:
   ```typescript
   export const MyActivity = Object.assign(MyActivityRoot, {
     Item: MyActivityItem,
     Progress: MyActivityProgress,
   });
   ```

7. **Compose activity** in `index.tsx`:
   ```typescript
   export function MyActivityActivity(props: MyActivityActivityProps) {
     return (
       <MyActivityProvider config={config}>
         <MyActivityActivityContent {...props} />
       </MyActivityProvider>
     );
   }
   ```

8. **Add translations** to `lib/i18n/translations/`:
   ```typescript
   // en.ts
   "myactivity.welcome.title": "Start My Activity",
   "myactivity.completed.title": "Activity Complete!",

   // it.ts
   "myactivity.welcome.title": "Inizia la mia attività",
   "myactivity.completed.title": "Attività completata!",
   ```

This structure ensures consistency across all activities and provides an excellent developer experience for creating new interactive components in the chat canvas.