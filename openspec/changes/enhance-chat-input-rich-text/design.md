# Design: Rich Text Chat Input with @Agent Mentions

## Context

Current state: Simple textarea-based input in `components/elements/prompt-input.tsx`
Goal: Transform into ProseMirror-based rich editor with @agent mentions support
Constraint: Mastra agents handle routing intelligently; frontend just needs to facilitate mention selection

## Architecture Overview

### Component Hierarchy

```
MultimodalInput
  └─ RichTextInput (replaces PromptInputTextarea)
      ├─ Editor (ProseMirror instance)
      ├─ MentionAutocomplete (floating menu)
      └─ MentionNode (custom node view)
```

### Key Components

**1. RichTextInput** (`components/elements/rich-text-input.tsx`)
- Drop-in replacement for `PromptInputTextarea`
- Manages ProseMirror instance and editor state
- Props: `value`, `onChange`, `onSubmit`, `disabled`, etc.
- Exposes same interface as current textarea for backward compatibility

**2. ProseMirror Schema** (`lib/editor/mention-schema.ts`)
- Base schema: paragraph, text, hardBreak
- Custom mark: mention with attributes { id, name, avatar }
- Custom node: doc (root)
- Simplified schema - no complex nesting

**3. Mention Plugin** (`lib/editor/mention-plugin.ts`)
- Detects `@` typing and opens autocomplete
- Filters agents by partial name match
- Inserts mention mark on selection
- Provides mention node view for rendering

**4. Agent Config** (`lib/ai/agent-config.ts`)
- Hardcoded const object with agent definitions
- Structured: id, name, description, avatar (emoji or URL), optional color and icon
- Shared across features (selector, mentions, etc.)
- Exported for use in UI and elsewhere

**Agent Config Structure:**
```typescript
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  avatar: string;          // emoji or URL
  color?: string;          // optional: for styling mentions
  icon?: string;           // optional: alternative to avatar
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  research: {
    id: 'research',
    name: 'Researcher',
    description: 'Specializes in web research and synthesis',
    avatar: '🔍',
    color: 'blue',
  },
  // ... more agents
} as const;
```

**5. MentionAutocomplete** (`components/mention-autocomplete.tsx`)
- Floating Popper menu positioned at mention trigger
- Radix UI Command for keyboard navigation
- Shows agent list with avatar, name, description
- Arrow key navigation, Enter to select

### Data Flow

```
User types "@re"
  ↓
ProseMirror keydown handler detects "@"
  ↓
Trigger mention plugin
  ↓
Open MentionAutocomplete at cursor position
  ↓
Filter AGENT_CONFIGS.* by match ("re" → researcher)
  ↓
Display filtered list with avatars
  ↓
User selects "Researcher"
  ↓
Insert mention mark: {id: 'researcher', name: 'Researcher', avatar: '🔍'}
  ↓
Close autocomplete
  ↓
User continues typing (mention now in message)
  ↓
Serialize to plain text: "@Researcher can you help?"
  ↓
Send to /api/chat as normal
```

## Technical Decisions

### Why ProseMirror?

1. **Already in project** - Avoids new dependencies
2. **Composable** - Plugins for mentions, extensible for future features (tags, commands)
3. **Keyboard-first** - Maintains keyboard shortcuts (Shift+Enter, etc.)
4. **Schema flexibility** - Custom nodes for mentions without breaking content model

### Why Agent Config File?

1. **Single source of truth** - Easy to maintain agent list
2. **Type-safe** - TypeScript const for autocomplete in components
3. **Decoupled from Mastra** - Frontend doesn't need to parse agent configs from backend
4. **Extensible** - Can add avatar URLs, colors, tags later

### Serialization Strategy

- **DOM → JSON**: ProseMirror exports to JSON with mention marks preserved
- **JSON → Plain text**: Strip marks, keep text content
- **Plain text output**: "@Researcher can you analyze this?"
- **Message API**: Send as-is; Mastra reads the mention and routes appropriately

**Rationale:**
- No changes to message API format
- Mastra's NLU already recognizes @mention patterns
- Preserve flexibility for future enhancements (mention routing rules, etc.)

## Schema Definition

```typescript
// lib/editor/mention-schema.ts
const mentionMark = mark('mention', {
  attrs: {
    id: { default: null },
    name: { default: '' },
    avatar: { default: '' },
  },
  parseDOM: [{ tag: 'span[data-mention]' }],
  toDOM: (mark) => [
    'span',
    {
      class: 'mention-node',
      'data-mention': mark.attrs.id,
    },
    0,
  ],
});

export const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    hardBreak: { inline: true, selectable: false },
  },
  marks: {
    mention: mentionMark,
  },
});
```

## UI/Styling

### Mention Rendering

- Badge-style inline element: `[🔍 Researcher]`
- Styled with: agent's color (if available), distinct background
- Hover: tooltip showing agent description
- Delete: backspace with cursor at end of mention

### Autocomplete Menu

- Floating popper below cursor
- Dark mode aware
- Keyboard navigation (arrow keys, Enter to select, Esc to close)
- Show: agent avatar, name, description
- Highlight current selection
- Max 5 items visible (scroll if needed)

## Error Handling

- Invalid/unknown agent mention: treat as plain text
- Autocomplete no results: show "No agents found" message
- Editor initialization: fallback to textarea if ProseMirror fails
- Serialization: always produce valid plain text output

## Performance Considerations

1. **Lazy load agent config**: Import only when MultimodalInput mounts
2. **Debounce autocomplete filtering**: 100ms debounce on input
3. **Memoize autocomplete component**: Prevent unnecessary re-renders
4. **Virtual scrolling**: If agent list grows large (future enhancement)

## Testing Strategy

- **Unit tests**: ProseMirror plugin logic, schema validation
- **Component tests**: RichTextInput behavior (typing, mention insertion, deletion)
- **E2E tests**: Full flow from @mention to message send
- **Snapshot tests**: Serialization output for plain text export

## Migration Path

1. Add RichTextInput component alongside PromptInputTextarea
2. Feature flag or gradual rollout to test
3. Swap in MultimodalInput when stable
4. Keep PromptInputTextarea for fallback/backward compatibility

## Open Questions

- Should agent avatars be emoji or image URLs? (Decision: Start with emoji, extensible)
- Should we support agent selection by keyboard-only (no autocomplete)? (Decision: Autocomplete is primary, tab/arrow support)
- Should deleted mentions create rich text deletion marks or just remove? (Decision: Just remove for simplicity)
