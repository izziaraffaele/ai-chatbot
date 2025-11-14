# Implementation Tasks: Add Agent Selector

## 1. Create Agent Configuration
- [ ] 1.1 Create `lib/ai/agent-config.ts` with hardcoded agent definitions
- [ ] 1.2 Define `AgentConfig` interface with `id`, `name`, `description`, `avatar`, optional `color` and `icon`
- [ ] 1.3 Export `AGENT_CONFIGS` object with available agents (currently: Research agent)
- [ ] 1.4 Ensure Research agent has id, name, description, avatar, and optional color

## 2. Create Agent Selection Hook
- [ ] 2.1 Create `hooks/use-selected-agent.ts`
- [ ] 2.2 Use `useLocalStorage` from `usehooks-ts` with key `'selectedAgent'`
- [ ] 2.3 Set default to first available sub-agent
- [ ] 2.4 Export hook with `selectedAgent` and `setSelectedAgent`

## 3. Create Agent Selector Component
- [ ] 3.1 Create `components/agent-selector.tsx`
- [ ] 3.2 Accept `selectedAgent`, `onAgentChange`, and `status` props
- [ ] 3.3 Render dropdown button with selected agent name
- [ ] 3.4 Display all available sub-agents in dropdown menu
- [ ] 3.5 Show name, description, and avatar for each sub-agent
- [ ] 3.6 Call `onAgentChange` when user selects a sub-agent

## 4. Update Multimodal Input Component
- [ ] 4.1 Import `useSelectedAgent` hook in `components/multimodal-input.tsx`
- [ ] 4.2 Call hook to get `selectedAgent` and `setSelectedAgent`
- [ ] 4.3 Remove `selectedModelId` and `onModelChange` props from PureMultimodalInput
- [ ] 4.4 Replace `ModelSelectorCompact` import with `AgentSelector`
- [ ] 4.5 Render `AgentSelector` with selected agent and change handler
- [ ] 4.6 Pass selected agent to `submitForm` logic

## 5. Update Chat Component
- [ ] 5.1 Remove `currentModelId` state from `components/chat.tsx`
- [ ] 5.2 Remove `currentModelIdRef` ref
- [ ] 5.3 Remove `setCurrentModelId` setter calls
- [ ] 5.4 Remove `initialChatModel` prop
- [ ] 5.5 Update `sendMessage` call to include selected agent in request body

## 6. Update Chat Request Structure
- [ ] 6.1 Ensure `components/multimodal-input.tsx` passes agent in message metadata
- [ ] 6.2 Verify agent parameter flows through to chat API endpoint

## 7. Clean Up Model Selector
- [ ] 7.1 Check for any remaining imports of `ModelSelectorCompact`
- [ ] 7.2 Check if `components/model-selector.tsx` is used elsewhere
- [ ] 7.3 Remove or archive if no longer needed

## 8. Code Quality
- [ ] 8.1 Run `pnpm lint` and fix any issues
- [ ] 8.2 Run `pnpm format` to ensure code style
- [ ] 8.3 Verify TypeScript compilation succeeds

## 9. Testing & Validation
- [ ] 9.1 Test agent selection persists to local storage across page reloads
- [ ] 9.2 Test selected agent is included in chat request body
- [ ] 9.3 Test UI displays correct sub-agent information
- [ ] 9.4 Test default sub-agent selection on first load
- [ ] 9.5 Test dropdown menu opens and closes
- [ ] 9.6 Test selecting different agents updates the UI
