/**
 * Agent configuration for sub-agents
 * Defines available agents that users can select to handle specialized tasks
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  avatar: string; // emoji or URL
  color?: string; // optional: for styling (e.g., 'blue', '#3b82f6')
  icon?: string; // optional: alternative to avatar
}

/**
 * Available agent configurations
 * Currently supports the Research agent for web search and synthesis
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  research: {
    id: 'research',
    name: 'Researcher',
    description: 'Specializes in web research and synthesis',
    avatar: '🔍',
    color: 'blue',
  },
} as const;

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
 * Get default agent (first available)
 */
export function getDefaultAgent(): AgentConfig {
  const agents = getAvailableAgents();
  return agents[0] || AGENT_CONFIGS.research;
}
