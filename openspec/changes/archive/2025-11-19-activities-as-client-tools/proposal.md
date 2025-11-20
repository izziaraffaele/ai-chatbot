# Create Activities as Client Tools

## Proposal

Add support for activities as client tools that the assistant can create, manage, and provide feedback on. This enables interactive learning experiences where the AI can generate quizzes and flashcards dynamically based on the conversation context.

## Problem Statement

Currently, activities are static components that need to be manually integrated with stores. We want to enable the assistant to:

1. Dynamically create activities based on conversation context
2. Present activities to users for completion within the chat interface
3. Receive activity results and provide personalized feedback
4. Support multiple activity types (quiz, flashcards, etc.)

## Solution

### 1. Consolidated Activity Tool Architecture

Create a single `tools/activity.tsx` file that consolidates all activity-related functionality:

**Key Components:**
- **ActivityToolProvider**: Wraps the assistant chat, manages Promise resolution for activity completion
- **Activity Context**: Provides `resolveActivity(toolCallId, result)` and `isResolved(toolCallId)` functions
- **Client Tool**: Registers `createActivity` action with type-safe Zod schemas
- **Tool UI Component**: Renders activities using existing QuizActivity/FlashcardActivity components

**Architecture Flow:**
1. Assistant calls `createActivity` tool with typed input
2. Tool creates Promise and stores resolver using `toolCallId`
3. Tool returns activity data for UI rendering
4. Tool UI component renders activity with Player wrapper
5. User completes activity → UI calls `resolveActivity(toolCallId, result)`
6. Promise resolves → Assistant receives results for feedback

**Single File Structure:**
- All activity-related code in one location
- Type-safe schemas matching existing component interfaces
- Promise-based completion system
- Context for synchronizing tool action and tool UI

### 2. Tool UI Component with Type Safety

Create a tool UI component that renders activities using the existing activity components:

**Key Features:**
- Renders QuizActivity and FlashcardActivity with Player wrapper
- Uses `useActivityContext()` to access completion functions
- Calls `resolveActivity(toolCallId, result)` on first completion
- Handles readonly states and loading conditions
- Type-safe casting of content based on activity type

**Integration Points:**
- Registers in tool UI registry as `createActivity`
- Extracts activity data from tool output
- Manages activity lifecycle through existing Player component

### 3. Tool Registration

Register the activity tool in the tool UI registry as `createActivity`.

### 4. Type Safety Integration

- **Zod Schemas**: Match existing QuizQuestion and Flashcard interfaces
- **Content Validation**: Ensures assistant generates valid component data
- **Type Guards**: Runtime type checking prevents malformed data
- **Interface Alignment**: Matches existing component expectations exactly

## Technical Impact

**Affected Files:**
- `tools/activity.tsx` - New consolidated activity tool
- `components/tools/index.tsx` - Tool registration
- Chat canvas wrapper - Add ActivityToolProvider

**Integration Points:**
- Leverages existing Player and AttemptStore patterns
- Uses existing QuizActivity and FlashcardActivity components
- Integrates with current tool UI system
- Maintains type safety throughout the pipeline

## Benefits

1. **Dynamic Content**: Assistant can create activities based on conversation context
2. **Type Safety**: Zod schemas prevent malformed data and ensure component compatibility
3. **Personalized Learning**: Activities adapt to user's level and interests
4. **Immediate Feedback**: Assistant provides real-time feedback on performance
5. **Extensible**: Easy to add new activity types following the same type-safe pattern
6. **Seamless Integration**: Uses existing activity components and tracking system
7. **Consistent UX**: Activities appear in the chat interface like other tools
8. **Developer Experience**: Strong typing and validation prevent runtime errors

## Success Criteria

- Assistant can create quiz and flashcard activities with properly typed content using the `createActivity` tool
- Zod schemas prevent malformed data from reaching activity components
- Activities render correctly within the chat interface using existing components
- Activity state is properly managed through existing Player and Provider patterns
- Activity completion results are captured and available for assistant feedback
- Type safety prevents runtime errors and provides good developer experience
- System follows existing codebase patterns and conventions