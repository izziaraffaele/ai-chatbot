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
 * Supports the Research agent for web search and the Fondazione CON IL SUD assistants
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  researcher: {
    id: "researcher",
    name: "Researcher",
    description: "Specializes in web research and synthesis",
    avatar: "🔍",
    color: "blue",
    registryId: "researchAgent",
  },
  sfc_asse: {
    id: "sfc_asse",
    name: "Fondazione CON IL SUD - Esterno",
    description:
      "Assistente pubblico per informazioni sulla Fondazione e bandi",
    avatar: "🌉",
    color: "orange",
    registryId: "sfcAsseAgent",
  },
  sfc_assi: {
    id: "sfc_assi",
    name: "Fondazione CON IL SUD - INTERNO",
    description: "Assistente interno per gestione documenti e knowledge base",
    avatar: "🏢",
    color: "purple",
    registryId: "sfcAssiAgent",
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
 * Get default agent (Fondazione Assi - internal)
 */
export function getDefaultAgent(): AgentConfig {
  return AGENT_CONFIGS.sfc_assi;
}

export function getAgentConfigByRegistryId(
  id: string
): AgentConfig | undefined {
  return Object.values(AGENT_CONFIGS).find(
    (config) => config.registryId === id
  );
}
