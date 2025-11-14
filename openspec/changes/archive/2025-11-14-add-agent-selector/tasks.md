# Implementation Tasks: Add Agent Selector

## 1. Create Agent Configuration
- [x] 1.1 Create `lib/ai/agent-config.ts` with hardcoded agent definitions
- [x] 1.2 Define `AgentConfig` interface with `id`, `name`, `description`, `avatar`, optional `color` and `icon`
- [x] 1.3 Export `AGENT_CONFIGS` object with available agents (currently: Research agent)
- [x] 1.4 Ensure Research agent has id, name, description, avatar, and optional color

## 2. Create Agent Selection Hook
- [x] 2.1 Create `hooks/use-selected-agent.ts`
- [x] 2.2 Use `useLocalStorage` from `usehooks-ts` with key `'selectedAgent'`
- [x] 2.3 Set default to first available sub-agent
- [x] 2.4 Export hook with `selectedAgent` and `setSelectedAgent`

## 3. Create Agent Selector Component
- [x] 3.1 Create `components/agent-selector.tsx`
- [x] 3.2 Accept `selectedAgent`, `onAgentChange`, and `status` props
- [x] 3.3 Render dropdown button with selected agent name
- [x] 3.4 Display all available sub-agents in dropdown menu
- [x] 3.5 Show name, description, and avatar for each sub-agent
- [x] 3.6 Call `onAgentChange` when user selects a sub-agent

## 4. Update Multimodal Input Component
- [x] 4.1 Import `useSelectedAgent` hook in `components/multimodal-input.tsx`
- [x] 4.2 Call hook to get `selectedAgent` and `setSelectedAgent`
- [x] 4.3 Remove `selectedModelId` and `onModelChange` props from PureMultimodalInput
- [x] 4.4 Replace `ModelSelectorCompact` import with `AgentSelector`
- [x] 4.5 Render `AgentSelector` with selected agent and change handler
- [x] 4.6 Pass selected agent to `submitForm` logic

## 5. Update Chat Component
- [x] 5.1 Remove `currentModelId` state from `components/chat.tsx`
- [x] 5.2 Remove `currentModelIdRef` ref
- [x] 5.3 Remove `setCurrentModelId` setter calls
- [x] 5.4 Remove `initialChatModel` prop
- [x] 5.5 Update `sendMessage` call to include selected agent in request body

## 6. Update Chat Request Structure
- [x] 6.1 Ensure `components/multimodal-input.tsx` passes agent in message metadata
- [x] 6.2 Verify agent parameter flows through to chat API endpoint

## 7. Clean Up Model Selector
- [x] 7.1 Check for any remaining imports of `ModelSelectorCompact`
- [x] 7.2 Check if `components/model-selector.tsx` is used elsewhere
- [x] 7.3 Remove or archive if no longer needed

## 8. Code Quality
- [x] 8.1 Run `pnpm lint` and fix any issues
- [x] 8.2 Run `pnpm format` to ensure code style
- [x] 8.3 Verify TypeScript compilation succeeds

## 9. Testing & Validation
- [x] 9.1 Test agent selection persists to local storage across page reloads
- [x] 9.2 Test selected agent is included in chat request body
- [x] 9.3 Test UI displays correct sub-agent information
- [x] 9.4 Test default sub-agent selection on first load
- [x] 9.5 Test dropdown menu opens and closes
- [x] 9.6 Test selecting different agents updates the UI
