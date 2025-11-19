# Activity Tracking System

Core attempt tracking system for managing dynamic AI chat experiences and interactive activities within the chat canvas.

## Overview

This module provides a lightweight, in-memory attempt tracking system with:
- **Reactive state management** with subscription-based updates
- **Type-safe operations** with comprehensive validation
- **Event timeline tracking** for detailed activity monitoring
- **Generic interfaces** for any activity type (quiz, assessment, workflow, etc.)
- **React integration** with hooks and components for chat canvas

## Quick Start

### Basic Usage

```typescript
import { createAttemptStore } from '@/lib/activity-tracking';
import { Player } from '@/components/activities/player';

// Create a store for your activity
const store = createAttemptStore('quiz-123', 'quiz');

// Wrap your activity with Player for React integration
function MyActivity() {
  return (
    <Player store={store}>
      <QuizComponent />
    </Player>
  );
}

// Use the store in your components
function QuizComponent() {
  const { state, store } = usePlayer();

  const startQuiz = async () => {
    await store.start({ metadata: { difficulty: 'medium' }});
  };

  const recordAnswer = async (answer: string) => {
    await store.sendEvent({
      action: 'quiz.answer',
      data: { questionId: 'q1', answer, isCorrect: true }
    });
  };

  return (
    <div>
      <button onClick={startQuiz}>Start Quiz</button>
      <button onClick={() => recordAnswer('A')}>Answer A</button>
    </div>
  );
}
```

### Quiz Activity Example

```typescript
import { useQuizPlayer } from '@/components/activities/quiz/use-quiz-player';

function InteractiveQuiz() {
  const quiz = useQuizPlayer({
    questions: [
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
    ],
    requireConfirm: true
  });

  if (quiz.screen === 'welcome') {
    return <button onClick={quiz.handlers.start}>Start Quiz</button>;
  }

  return (
    <div>
      <h2>{quiz.currentQuestion?.question}</h2>
      {quiz.currentQuestion?.choices?.map((choice) => (
        <button
          key={String(choice.value)}
          onClick={() => quiz.handlers.selectAnswer(choice.value)}
          disabled={quiz.isAnswerValidated}
        >
          {choice.label}
        </button>
      ))}
      {quiz.selectedAnswer && (
        <button onClick={quiz.handlers.confirmAnswer}>Submit</button>
      )}
      {quiz.isAnswerValidated && (
        <button onClick={quiz.handlers.next}>Next</button>
      )}
    </div>
  );
}
```

## Core Concepts

### Attempt

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

### Event Timeline

Events capture all interactions during an attempt:

```typescript
type AttemptEvent = {
  id: string;
  action: string;          // e.g., 'quiz.answer', 'activity.start'
  createdAt: Date;
  data: Record<string, unknown>;
};
```

### Store State

Reactive state container:

```typescript
type AttemptState = {
  currentAttempt: Attempt | null;
  events: AttemptEvent[];
};
```

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

### Event Factory

#### `ActivityEvent`

Generic event factory for lifecycle and custom events.

```typescript
import { ActivityEvent } from '@/lib/activity-tracking';

// Lifecycle events
ActivityEvent.lifecycle('activity.start');
ActivityEvent.lifecycle('activity.complete');

// Custom events with typed data
ActivityEvent.custom('my.action', { userId: '123', value: 42 });
```

#### Domain-specific events

Create your own event factories for custom activity types:

```typescript
// components/activities/quiz/types.ts
export const QuizEvent = {
  answer: (data: QuizAnswerEventData) => ({
    action: 'quiz.answer' as const,
    data
  }),
  timeUp: (data: QuizTimeUpEventData) => ({
    action: 'quiz.time_up' as const,
    data
  })
};
```

### Validation

The system includes comprehensive runtime validation:

- **Entity validation** for attempts and events
- **Status transition validation** to ensure valid state changes
- **Argument validation** for start/complete parameters
- **Event data validation** with domain-specific rules

Validation errors throw `AttemptError` with descriptive messages.

```typescript
import { AttemptError } from '@/lib/activity-tracking';

try {
  await store.start();
} catch (error) {
  if (error instanceof AttemptError) {
    console.error('Validation failed:', error.message);
  }
}
```

## Component Architecture

### Player Component

The `Player` component provides state management and composition primitives:

```tsx
<Player store={store} variant="default">
  <Player.Header>
    <Player.Progress current={2} total={5} showBar />
  </Player.Header>

  <Player.Screen>
    {/* Your activity content */}
  </Player.Screen>

  <Player.Controls>
    {/* Action buttons */}
  </Player.Controls>
</Player>
```

### Activity Components

Domain-specific components extend the base functionality:

```tsx
// components/activities/quiz/quiz-player.tsx
export function QuizPlayer(props: QuizPlayerProps) {
  const store = useMemo(() =>
    createAttemptStore(`quiz-${Date.now()}`, 'quiz'), []
  );

  return (
    <Player store={store}>
      <QuizPlayerContent {...props} />
    </Player>
  );
}
```

## Best Practices

### Type Safety

Use generic types for type-safe operations:

```typescript
interface QuizStartArgs {
  sessionId?: string;
  metadata?: { difficulty: 'easy' | 'medium' | 'hard' };
}

interface QuizCompleteArgs {
  score: number;
  totalQuestions: number;
}

const store = createAttemptStore<QuizStartArgs, QuizCompleteArgs>('quiz-1', 'quiz');
```

### Error Handling

Wrap operations in try-catch blocks:

```typescript
const handleStart = async () => {
  try {
    await store.start();
  } catch (error) {
    if (error instanceof AttemptError) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('Unexpected error occurred');
    }
  }
};
```

### Cleanup

Use the Player component for automatic cleanup, or manually cleanup:

```tsx
useEffect(() => {
  return () => {
    // Player component does this automatically
    if (store.getState().currentAttempt?.status === 'in_progress') {
      store.abandon({ metadata: { reason: 'unmount' } });
    }
  };
}, [store]);
```

### Performance

- The store uses efficient subscription management
- Events are stored immutably
- State updates are batched using `requestAnimationFrame`
- No persistence overhead - everything is in-memory

## Integration with Chat Canvas

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

Activities render as interactive components within chat threads, maintaining full chat context while providing rich interactive experiences.

## Extending the System

### New Activity Types

1. Create domain types:
```typescript
// components/activities/survey/types.ts
export type SurveyAnswerEventData = {
  questionId: string;
  answer: string | number;
} & Record<string, unknown>;
```

2. Create event factory:
```typescript
export const SurveyEvent = {
  answer: (data: SurveyAnswerEventData) => ({
    action: 'survey.answer' as const,
    data
  })
};
```

3. Create domain-specific hook:
```typescript
export function useSurveyPlayer(config: SurveyConfig) {
  const { state, store } = usePlayer<SurveyStartArgs, SurveyCompleteArgs>();
  // Survey-specific logic here
  return { state, store, /* survey-specific methods */ };
}
```

### Custom Validation

Add domain-specific validation rules:

```typescript
// components/activities/survey/validation.ts
export function validateSurveyData(data: Record<string, unknown>): void {
  if ('rating' in data && typeof data.rating !== 'number') {
    throw new AttemptError('Survey rating must be a number');
  }
  if ('rating' in data && (data.rating < 1 || data.rating > 5)) {
    throw new AttemptError('Survey rating must be between 1 and 5');
  }
}
```

## Examples

See the quiz implementation for a complete example:
- `components/activities/quiz/` - Full quiz activity implementation
- `components/activities/player.tsx` - Generic Player component
- `hooks/use-player.ts` - Generic React integration

## Troubleshooting

### Common Issues

1. **"usePlayer must be used within a Player component"**
   - Ensure your component is wrapped in `<Player store={store}>`

2. **"Activity already started" error**
   - Complete or abandon current attempt before starting a new one

3. **"Invalid status transition" error**
   - Check that you're following valid state transitions (in_progress → completed)

4. **Events not being recorded**
   - Check if the activity is paused (`store.isPaused`)
   - Ensure you're calling `sendEvent` after `start` and before `complete`

### Debug Tips

- Check `store.getState()` for current state
- Use `store.subscribe()` to monitor state changes
- Enable validation errors to see detailed error messages
- Use browser DevTools to inspect component re-renders