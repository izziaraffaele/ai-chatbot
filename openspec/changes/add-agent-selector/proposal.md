# Change: Replace Model Selector with Agent Selector (Frontend)

## Why

The model selector in the chat input field is deprecated. The chat agent now supports calling specialized sub-agents to handle specific tasks. Users need a UI to select which sub-agent to invoke for their requests. This replaces the model selector with an agent selector that allows users to choose the appropriate sub-agent (e.g., research for web search) while keeping all agent routing logic frontend-based with local storage persistence.

## What Changes

- **Remove:** Model selector dropdown from chat input field
- **Add:** Sub-agent selector dropdown in chat input field
- **Add:** Hardcoded sub-agent definitions (name, description, avatar) for available sub-agents
- **Add:** Custom hook (`useSelectedAgent`) for managing sub-agent selection with local storage persistence
- **Modify:** Chat request to include selected sub-agent in body parameters
- **Modify:** Chat component state to track selected sub-agent instead of selected model

## Impact

- **Affected specs:** `mastra-agent-integration` (add sub-agent-selection requirements)
- **Affected code:**
  - `components/chat.tsx` - Replace `currentModelId` state with sub-agent selection, pass to API
  - `components/multimodal-input.tsx` - Replace `ModelSelectorCompact` with agent selector
  - `components/agent-selector.tsx` - Create new agent selector dropdown component
  - `hooks/use-selected-agent.ts` - Create new hook with local storage persistence
  - `lib/ai/agent-config.ts` - Import hardcoded agent configurations (id, name, description, avatar)
- **User-facing changes:** Users see sub-agent options instead of model names
- **Breaking changes:** Model selector is completely removed from UI
- **Scope:** Frontend only (agent routing exists in backend)
- **Available sub-agents:** Research agent (for web search and synthesis)

