import { Agent } from "@mastra/core/agent";
import { figureSuggesterAgentSystemPrompt } from "./system-prompt";

/**
 * Figure Suggester Agent
 *
 * Specialized agent for recommending professional figures (Figure Professionali)
 * from the Regione Toscana catalog based on Unità Formative (UF) descriptions.
 *
 * This agent:
 * - Analyzes UF names and descriptions
 * - Considers the selected sector (settore)
 * - Recommends top 3 most suitable professional figures
 * - Provides brief motivations for each recommendation
 *
 * **Important:** This agent is designed for agent-to-agent collaboration.
 * It should be called by the Chat Agent when users need figure suggestions.
 *
 * Example usage (from chat agent):
 * ```typescript
 * const suggestions = await figureSuggesterAgent.generate(`
 *   UF: Programmazione Web
 *   Settore: informatica
 *   Figure disponibili:
 *   - Tecnico informatico (123): Sviluppa e mantiene software...
 *   - Analista programmatore (456): Analizza requisiti...
 * `);
 * ```
 */
export const figureSuggesterAgent = new Agent({
  name: "Figure Suggester",
  instructions: figureSuggesterAgentSystemPrompt(),
  model: "openai/gpt-4.1", // Fast model for quick suggestions
  defaultGenerateOptions: {
    maxSteps: 1,
    maxRetries: 1,
  },
  defaultStreamOptions: {
    maxSteps: 1,
    maxRetries: 1,
  },
});
