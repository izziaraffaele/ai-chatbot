## Context

This change introduces a new architectural pattern for dynamic activity creation within the chat interface. Currently, activities are static components that require manual integration with stores and state management. The goal is to enable the assistant to create activities dynamically based on conversation context while maintaining type safety and compatibility with existing activity components.

**Constraints:**
- Must maintain compatibility with existing QuizActivity and FlashcardActivity components
- Must integrate with existing tool UI system and chat canvas
- Must provide type safety to prevent malformed content generation
- Must follow existing client tool (assistant action) patterns

**Stakeholders:**
- Users who want interactive learning experiences in chat
- Developers who maintain activity components
- AI assistants that need to generate dynamic content

## Goals / Non-Goals

### Goals
- Enable dynamic activity creation by the assistant
- Maintain type safety and prevent runtime errors
- Integrate seamlessly with existing tool UI architecture
- Leverage existing activity components without modification
- Provide extensible pattern for future activity types

### Non-Goals
- Redesign existing activity components
- Replace current activity tracking system
- Create new persistence mechanisms
- Modify the chat interface architecture
- Add new activity types beyond quiz and flashcards

## Decisions

### Decision: Type-Safe Zod Schemas
**What:** Use Zod schemas that precisely match existing QuizQuestion and Flashcard interfaces
**Why:** Prevents malformed data from reaching components and ensures type safety at runtime
**Alternatives considered:**
- Runtime type checking without schemas (less type safety)
- Loose JSON validation (risk of component errors)
- Manual validation functions (more maintenance overhead)

### Decision: Client Tool Pattern
**What:** Use useAssistantAction hook following existing pattern from demo-config
**Why:** Leverages existing tool registration system and maintains consistency
**Alternatives considered:**
- Custom tool registration (more complexity)
- Direct component integration (less flexible)
- Server-side tool generation (requires API changes)

### Decision: Tool UI Component Architecture
**What:** Create dedicated Tool UI component that renders activities using Player wrapper
**Why:** Integrates with existing tool display system while maintaining component isolation
**Alternatives considered:**
- Direct activity rendering in messages (breaks tool patterns)
- Custom activity display system (duplicated effort)
- Inline component rendering (no tool context)

### Decision: Store Management Pattern
**What:** Create activity stores using existing createAttemptStore function
**Why:** Maintains compatibility with existing activity tracking and state management
**Alternatives considered:**
- In-memory state only (loses tracking capabilities)
- Custom store implementation (duplicated effort)
- Global store pattern (complexity for dynamic activities)

## Risks / Trade-offs

### Risk: Schema Mismatch with Component Evolution
**Mitigation:** Zod schemas will be kept in sync with component interfaces through type checking and tests

### Risk: Performance Impact with Large Activities
**Mitigation:** Implement lazy loading and pagination for large activity datasets

### Risk: Complex Error Handling in Chat Context
**Mitigation:** Graceful degradation and clear error messages for validation failures

### Trade-off: Additional Complexity vs Dynamic Capabilities
**Justification:** The value of dynamic activity creation outweighs the added architectural complexity

### Trade-off: Type Safety vs Flexibility
**Justification:** Strict type safety prevents runtime errors and provides better developer experience

## Migration Plan

### Phase 1: Foundation (No Breaking Changes)
- Create client tool and tool UI components
- Add to tool registry
- Test with existing activity components

### Phase 2: Integration (Optional Enhancements)
- Add result formatting and feedback features
- Enhance error handling and validation
- Performance optimizations

### Phase 3: Extension (Future Capabilities)
- Add support for new activity types
- Enhanced configuration options
- Advanced result analytics

**Rollback Plan:**
- Remove client tool registration
- Remove tool UI component
- Revert tool registry changes
- No impact on existing activity components

## Resolved Questions

### 1. Activity Result Format ✅ APPROVED

**Format:** Follow existing demo-actions pattern with structured result object containing activity type, completion data, and metadata.

### 2. Store Persistence ✅ RESOLVED

**Approach:** Session-scoped with promise-based completion using ActivityToolProvider
- Tool action creates Promise that resolves on first activity completion
- ActivityToolProvider synchronizes tool action and tool UI
- Attempt stores can be recreated (from message parts) and activities replayed
- Assistant considers only the first result as tool output

### 3. Content Limits

**Limits:** Graduated constraints based on content type (50 questions max, 100 flashcards max, 50KB total content)

### 4. Multiple Activities

**Management:** Unique activity IDs with ActivityToolProvider isolation

### 5. Schema Evolution

**Strategy:** Backward compatibility with versioned schemas and optional fields

### 6. Error Recovery

**Approach:** Graceful degradation with helpful feedback and suggestions

## Architecture Summary

### Promise-Based Completion System

The ActivityToolProvider implements a promise-based system where:

1. **Tool Execution:** Creates Promise and stores resolver using `toolCallId`
2. **UI Rendering:** Tool UI renders activity from tool message part input
3. **Completion Resolution:** Tool UI calls `resolveActivity(toolCallId, result)` when user completes
4. **First Completion Only:** Only first activity completion triggers tool result

### Key Components

1. **ActivityToolProvider**: Wraps assistant chat, manages Promise resolvers in state
2. **Activity Context**: Provides `resolveActivity(toolCallId, result)` and `isResolved(toolCallId)`
3. **Consolidated Tool**: Single `tools/activity.tsx` with schemas, provider, and UI component
4. **Type Safety**: Zod schemas matching existing QuizQuestion and Flashcard interfaces

### Integration Flow

```
Assistant → Tool Action → Store Resolver → Create Promise → Return Tool Message
                                    ↓
                            ActivityToolProvider State
                                    ↓
Tool UI Renders → User Completes → Call resolveActivity → Resolve Promise → Assistant Gets Result
```

## Technical Architecture

### Component Interaction Flow
```
Assistant → Client Tool (createActivity) → Activity Store Creation → Tool UI Component → Player Wrapper → Activity Component → User Interaction → Completion → Result → Assistant Feedback
```

### Data Flow
1. **Request Phase:** Assistant generates activity data with type-safe schemas
2. **Validation Phase:** Zod schemas validate content matches component expectations
3. **Creation Phase:** Activity store created for state management
4. **Rendering Phase:** Tool UI renders activity with Player wrapper
5. **Interaction Phase:** User interacts with existing activity components
6. **Completion Phase:** Results captured and formatted for assistant feedback

### Integration Points
- **Client Tools:** Integration with existing useAssistantAction pattern
- **Tool UI:** Integration with existing tool display and message system
- **Activity Components:** Integration with existing QuizActivity and FlashcardActivity
- **State Management:** Integration with existing Player and AttemptStore patterns
- **Type System:** Integration with existing TypeScript interfaces and Zod validation

## Success Metrics

- **Functional:** Assistant can create valid activities that render correctly
- **Type Safety:** Zero runtime errors due to malformed activity data
- **Performance:** Activity creation and rendering under 500ms
- **Compatibility:** Existing activity components work without modification
- **Extensibility:** New activity types can be added with minimal changes