# Prompt Suggestions Provider Design

## Architectural Decisions

### Provider Pattern Rationale
The provider pattern was chosen over the existing hook-based approach for several reasons:

1. **Separation of Concerns** - Suggestion data management is separate from UI rendering
2. **Flexibility** - Component can work with or without global context
3. **Testability** - Easier to unit test components with controlled props
4. **AI Elements Alignment** - Follows established patterns in chat primitives
5. **Future Extensibility** - Easy to add features like suggestion categories, analytics, etc.

### Context vs Props Design

#### Context Mode (with Provider)
```tsx
<ChatSuggestionProvider
  initialSuggestions={["Default 1", "Default 2"]}
  suggestions={["Dynamic 1", "Dynamic 2"]} // Merged with initial
  onApply={(suggestion) => console.log("Selected:", suggestion)}
>
  <ChatSuggestions /> // Uses context data
</ChatSuggestionProvider>
```

#### Props Mode (without Provider)
```tsx
<ChatSuggestions
  suggestions={["Only these suggestions"]}
  onApply={(suggestion) => console.log("Selected:", suggestion)}
/>
```

#### Hybrid Mode (with Provider + Props Override)
```tsx
<ChatSuggestionProvider suggestions={["A", "B", "C"]}>
  <ChatSuggestions
    suggestions={["Override 1", "Override 2"]} // Ignores context
    onApply={() => {}} // Ignores context onApply
  />
</ChatSuggestionProvider>
```

### Layout Architecture

#### Default Mode (Grid)
- Responsive 2-column layout on desktop
- Single column on mobile
- Based on historical `multimodal-input.tsx` implementation
- Uses CSS Grid for optimal spacing

#### Minimal Mode (Slider)
- Horizontal scrolling layout
- Uses existing `Suggestions` and `Suggestion` elements
- Better for space-constrained environments
- Maintains existing scroll behavior

### State Management

#### Provider State Structure
```typescript
interface ChatSuggestionContext {
  suggestions: string[];          // Combined initial + dynamic suggestions
  onApply: (suggestion: string) => void; // Selection handler
  hasProvider: boolean;          // Provider existence flag
}
```

#### Hook Behavior
```typescript
// With provider
const context = useChatSuggestions(); // Returns context data

// Without provider
const context = useChatSuggestions(); // Returns { hasProvider: false }
```

### Integration Points

#### ChatComposer Integration
```tsx
// In composer header when no messages
{messages.length === 0 && (
  <ChatSuggestions
    mode={isMobile ? "minimal" : "default"}
    suggestions={suggestions} // From usePromptSuggestions or context
    onApply={(suggestion) => {
      composer.textInput.setInput(suggestion);
      // Auto-focus after setting
    }}
  />
)}
```

#### AssistantChat Integration
```tsx
// Optional provider at app level
<ChatSuggestionProvider
  initialSuggestions={defaultSuggestions}
  onApply={(suggestion) => {
    // Handle suggestion selection globally
  }}
>
  <ChatProvider>
    <AssistantChat />
  </ChatProvider>
</ChatSuggestionProvider>
```

### Migration Strategy

#### Phase 1: Parallel Implementation
- Keep existing `usePromptSuggestions` hook
- Implement new provider pattern alongside
- Test both approaches

#### Phase 2: Gradual Migration
- Update `AssistantChat` to use new pattern
- Update `ChatComposer` to integrate suggestions
- Test functionality

#### Phase 3: Cleanup
- Remove deprecated `usePromptSuggestions`
- Remove demo-config suggestion dependencies
- Update any remaining usage

### Technical Considerations

#### Performance
- Provider context value is memoized to prevent unnecessary re-renders
- Suggestion arrays are shallow compared for changes
- Component renders only when suggestions actually change

#### Accessibility
- Suggestion buttons maintain proper ARIA attributes
- Keyboard navigation support in both layouts
- Screen reader compatibility maintained

#### TypeScript Safety
- Full type coverage for all props and context
- Generic types for extensibility
- Proper null handling for optional provider

### Error Handling

#### Provider Errors
- Graceful fallback when provider data is invalid
- Console warnings for malformed suggestions
- Default empty state for edge cases

#### Component Errors
- No-op when no suggestions provided
- Proper error boundaries around suggestion rendering
- Fallback to minimal mode on layout errors

## Future Extensibility

### Planned Features
1. **Suggestion Categories** - Group suggestions by topic
2. **Analytics Integration** - Track suggestion usage
3. **AI-Powered Suggestions** - Dynamic suggestions based on chat context
4. **Custom Renderers** - Allow custom suggestion button components
5. **Suggestion History** - Recently used suggestions

### Extension Points
- Provider context can be extended with additional metadata
- Component supports custom suggestion rendering via render props
- Hook can provide additional utility functions for suggestion management