/**
 * Agent configuration for sub-agents
 * Defines available agents that users can select to handle specialized tasks
 */

export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  registryId: string;
  avatar: string; // emoji or URL
  color?: string; // optional: for styling (e.g., 'blue', '#3b82f6')
  icon?: string; // optional: alternative to avatar
};

/**
 * Available agent configurations
 * Currently empty - sub-agents can be added here as needed
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {} as const;

/**
 * Get all available agents
 */
export function getAvailableAgents(): AgentConfig[] {
  return Object.values(AGENT_CONFIGS);
}

/**
 * Get agent config by ID
 */
export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_CONFIGS[id];
}

/**
 * Get default agent (first available, or undefined if none)
 */
export function getDefaultAgent(): AgentConfig | undefined {
  const agents = getAvailableAgents();
  return agents.at(0);
}

export function getAgentConfigByRegistryId(
  id: string
): AgentConfig | undefined {
  return Object.values(AGENT_CONFIGS).find(
    (config) => config.registryId === id
  );
}
