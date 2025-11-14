'use client';

import { useLocalStorage } from 'usehooks-ts';
import type { AgentConfig } from '@/lib/ai/agent-config';
import { AGENT_CONFIGS } from '@/lib/ai/agent-config';

/**
 * Hook for managing selected sub-agent with local storage persistence
 * Returns the selected agent config and a setter function
 */
export function useSelectedAgent() {
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage<string | undefined>(
    'selectedAgent',
    undefined
  );

  // Get the selected agent config if an agent is selected
  const selectedAgent: AgentConfig | undefined = selectedAgentId
    ? AGENT_CONFIGS[selectedAgentId]
    : undefined;

  const setSelectedAgent = (agent: AgentConfig | string | undefined) => {
    if (agent === undefined) {
      setSelectedAgentId(undefined);
    } else {
      const agentId = typeof agent === 'string' ? agent : agent.id;
      setSelectedAgentId(agentId);
    }
  };

  return {
    selectedAgent,
    setSelectedAgent,
    selectedAgentId,
  };
}
