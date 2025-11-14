# Design: Agent Selector Feature

## Context

The chat interface currently displays a deprecated model selector that allows users to choose between different AI models. However, model selection is now handled internally by Mastra agents. The goal is to replace this with an agent selector that allows users to direct requests to specific sub-agents (currently: research agent) while maintaining local state management.

## Goals / Non-Goals

**Goals:**
- Replace model selector with sub-agent selector in chat input UI
- Allow users to select which sub-agent the chat agent will invoke
- Persist selected sub-agent preference to browser local storage
- Pass selected sub-agent to chat API in request body
- Maintain clean separation between frontend state and backend logic

**Non-Goals:**
- Modify backend agent routing logic
- Change API contract or database schema
- Add server-side persistence of agent preferences
- Create user settings page for agent selection

## Decisions

### 1. Agent Configuration Storage
**Decision:** Hardcode agent definitions client-side in `lib/ai/agent-config.ts`

**Rationale:**
- Agents are frontend configuration, not dynamic data
- Reduces API calls and complexity
- Easier for frontend developers to manage
- Matches existing pattern for hardcoded model definitions
- Single source of truth shared across features (mentions, selector, etc.)

**Unified Data Structure:**
```typescript
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  avatar: string;          // emoji or URL
  color?: string;          // optional: for styling (e.g., 'blue', '#3b82f6')
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

### 2. State Management Pattern
**Decision:** Use custom hook `useSelectedAgent()` with `useLocalStorage()` for persistence

**Rationale:**
- Follows existing React hooks patterns in the codebase (e.g., `useTranslations()`)
- `useLocalStorage` from `usehooks-ts` (already dependency) handles browser storage
- Cleaner than managing state in Chat component
- Easier to test and reuse across components
- Automatic initialization and serialization

**Hook Signature:**
```typescript
function useSelectedAgent() {
  const [selectedAgent, setSelectedAgent] = useLocalStorage('selectedAgent', defaultAgent);
  return { selectedAgent, setSelectedAgent };
}
```

### 3. Component Architecture
**Decision:** Create new `AgentSelector` component replacing `ModelSelectorCompact`

**Rationale:**
- Clear separation of concerns
- Same UI pattern as existing model selector
- Easier to maintain and test independently
- Can be reused if needed in other parts of UI

### 4. Props Flow
**Decision:** Pass selected agent through props chain: Chat → MultimodalInput → AgentSelector

**Rationale:**
- Follows existing component composition pattern
- Keeps component tree predictable
- MultimodalInput remains a "pure" component receiving props
- Chat component coordinates state management

### 5. API Integration
**Decision:** Include selected agent in chat request body as `agent` parameter

**Rationale:**
- Simple to implement on frontend
- Backend already expects and handles agent parameter
- Maintains separation from model selection

## Alternatives Considered

### Alternative 1: Global State (Redux/Zustand)
**Rejected:** Unnecessary complexity for single state value; useLocalStorage hook is sufficient

### Alternative 2: Server-side Persistence
**Rejected:** Out of scope per requirements; local storage meets immediate needs

### Alternative 3: Dynamically Load Sub-agents from API
**Rejected:** Adds unnecessary API call; hardcoding is faster and simpler for current use case

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Hard-coded agents become stale if backend changes | Backend already stable; can update client config when new agents added |
| Local storage collision with other apps | Use prefixed key name if needed; `selectedAgent` is specific enough |
| Users expect sub-agent to affect main model behavior | Clear labeling in UI that research agent is for specific tasks |

## Implementation Sequence

1. Create `lib/ai/agent-config.ts` with unified agent definitions and `AgentConfig` interface
2. Create `hooks/use-selected-agent.ts` hook with local storage persistence
3. Create `components/agent-selector.tsx` component using agent config
4. Update `components/multimodal-input.tsx` to use hook and component
5. Update `components/chat.tsx` to pass selected agent to API
6. Remove unused `ModelSelectorCompact` references

## Open Questions

- Should there be a UI indicator of what the selected sub-agent does?
- Should we prefetch sub-agent capabilities on component mount?
- Do we need analytics/telemetry for sub-agent selection?

