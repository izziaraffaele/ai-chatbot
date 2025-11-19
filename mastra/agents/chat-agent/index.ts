import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { mastraTools } from "../../tools";
import { getGeoHints, getRuntimeConfig } from "../../utils/runtime-utils";
import { plannerAgent } from "../planner-agent";
import { researchAgent } from "../research-agent";
import { chatAgentSystemPrompt } from "./system-prompt";

/**
 * Mastra Chat Agent
 *
 * Configuration:
 * - System prompt dynamically built from runtime config (identity, capabilities, features)
 * - Geolocation hints integrated for contextual responses
 * - All 4 tools registered for real-time document and weather operations
 * - Memory configured with LibSQL for within-session conversation history
 * - Model can be overridden in agent.generate() call during Phase 2 integration
 */
export const chatAgent = new Agent({
  name: "Chat Agent",
  instructions: ({ runtimeContext }) => {
    // Extract runtime configuration and geolocation hints
    const config = getRuntimeConfig(runtimeContext);
    const geoHints = getGeoHints(runtimeContext);

    // Build comprehensive system prompt from configuration
    const prompt = chatAgentSystemPrompt(config, geoHints);

    return prompt;
  },
  model: "openai/gpt-4.1", // Default, overridden at runtime
  tools: {
    getWeather: mastraTools.getWeather,
    createDocument: mastraTools.createDocument,
    updateDocument: mastraTools.updateDocument,
    requestSuggestions: mastraTools.requestSuggestions,
  },
  agents: {
    researchAgent,
    plannerAgent,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: "resource", // Persist memory across threads for the same user
        template: `# User Profile
                ## Personal Information
                - **Name:**
                - **Preferred Name:**
                - **Location:**
                - **Timezone:**

                ## Communication Preferences
                - **Detail Level:** [Brief | Moderate | Comprehensive]
                - **Citation Style:** [Inline URLs | Footnotes | Minimal]
                - **Tone Preference:** [Professional | Casual | Friendly]
                - **Language:**

                ## Active Context

                ### Current Planning Task
                - **Goal:**
                - **Domain:** [study | teaching | travel | project | other]
                - **Status:** [gathering_context | researching | planning | refining | completed]
                - **Time Horizon:**
                - **Key Constraints:**
                - **Preferences:**

                ### Research Interests
                - **Recent Topics:**
                - **Preferred Sources:**

                ### Document & Artifact Preferences
                - **Document Types:** [markdown | code | spreadsheet]
                - **Code Languages:**
                - **Formatting Preferences:**

                ## User Preferences & Patterns
                - **Recurring Goals:**
                - **No-Go Items:** [Things to avoid]
                - **Budget Sensitivity:**
                - **Planning Style:** [detailed | flexible | minimal]
                - **Research Depth:** [quick_answers | thorough | comprehensive]

                ## Important Facts to Remember
                - **Ongoing Projects:**
                - **Key Dates/Deadlines:**
                - **Mentioned Interests:**
                - **Previous Assistance Areas:**

                ## Session Notes
                - **Last Interaction:**
                - **Follow-up Items:**
                - **Pending Questions:**
`,
      },
    },
  }),
  defaultStreamOptions: {
    maxSteps: 30,
  },
});
