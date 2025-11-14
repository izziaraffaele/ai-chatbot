# Change: Add Rich Text Chat Input with @Agent Mentions

## Why

The current chat input is a simple textarea that doesn't leverage Mastra's intelligent agent routing. Users cannot explicitly invoke specialized sub-agents (like @researcher) through the UI, even though the backend can route based on mentions. By transforming the input into a rich text editor with @agent mentions, we enable:

1. **Explicit sub-agent invocation** - Users can mention @researcher, @specialist, etc. to direct requests
2. **Better discoverability** - Autocomplete reveals available sub-agents with descriptions and avatars
3. **Improved UX** - Modern mention-style interaction familiar from social platforms
4. **Mastra routing leverage** - Backend agent intelligence automatically routes to appropriate sub-agent

## What Changes

- **Replace simple textarea with ProseMirror-based rich text editor**
  - Maintains existing single/multi-line input UX (Shift+Enter for newline)
  - Custom ProseMirror schema with agent mention node
  - Seamless integration with existing chat API flow

- **Add @agent mention system**
  - Trigger with `@` character to open agent autocomplete
  - Dropdown shows available agents configured in `lib/ai/agent-config.ts`
  - Displays agent name, description, and avatar for visual identification
  - Structured mention node preserving agent ID and metadata
  - Distinctive visual styling (agent badge with avatar, optional color)
  - Removable via backspace

- **Agent configuration integration**
  - Uses shared `lib/ai/agent-config.ts` with hardcoded agent definitions
  - Agents include: id, name, description, avatar, optional color and icon
  - Centralized source of truth for all agent references
  - Single file for consistent agent data across features

- **Message flow**
  - Mentions preserved in message text: "@researcher, can you look into this?"
  - Messages sent to `/api/chat` endpoint as before
  - Mastra's chatAgent intelligently routes based on mention detection
  - No changes to message serialization format needed

## Impact

- Affected specs:
  - **chat-input** (NEW) - Rich text input with @agent mention support
  - Related: `mastra-agent-integration` - Integrates with agent routing

- Affected code:
  - `components/elements/prompt-input.tsx` - Replace textarea with ProseMirror component
  - `components/rich-text-input.tsx` (NEW) - ProseMirror-based rich input component
  - `lib/editor/agent-mentions.ts` (NEW) - Agent mention schema and plugin
  - `lib/ai/agent-config.ts` (NEW) - Hardcoded agent configuration
  - `components/multimodal-input.tsx` - Integrate rich input component
  - `lib/types.ts` - Optional: update message types for mention metadata

## Shared Agent Configuration

The agent configuration is defined in `lib/ai/agent-config.ts` with the following unified structure:

```typescript
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  avatar: string;          // emoji or URL
  color?: string;          // optional: for styling
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

This configuration is used by both the mention system and other agent-related features.

## Implementation Scope

**In Scope:**
- ProseMirror editor with mention support
- Agent config file with available agents
- Visual mention nodes with agent metadata
- Autocomplete dropdown with agent details
- Mention removal/editing

**Out of Scope (Future):**
- #tags, /commands
- Mention-based permission rules
- Agent-specific message formatting
- Advanced agent filtering/search

## Dependencies

- ProseMirror (already in dependencies)
- Radix UI autocomplete/popper (already in dependencies)
- No new external dependencies required
