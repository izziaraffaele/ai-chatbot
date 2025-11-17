/**
 * Chat Agent System Prompt Factory
 *
 * Generates a comprehensive system prompt for the Mastra chat agent
 * using runtime configuration for identity, capabilities, and behaviors.
 */

import type { Geo } from "@vercel/functions";
import type { RuntimeConfig } from "@/config/runtime.schema";
import { artifactsPrompt } from "@/lib/ai/prompts";
import { ORCHESTRATION_PROMPT } from "./orchestration-prompt";

/**
 * Builds a dynamic system prompt for the Mastra chat agent
 *
 * Incorporates:
 * - Assistant identity from runtime config
 * - Organization/tenant information
 * - Available features and capabilities
 * - Environment context (site/app details)
 * - Geolocation hints for contextual responses
 * - Artifact creation guidance for structured content
 * - Available experiences/roles
 *
 * @param config - Runtime configuration with branding and identity
 * @param geoHints - Geolocation information from request origin
 * @returns System prompt string for agent initialization
 */
export function chatAgentSystemPrompt(
  config: RuntimeConfig,
  geoHints?: Partial<Geo>
): string {
  const sections: string[] = [];

  // ========================================================================
  // IDENTITY SECTION
  // ========================================================================
  sections.push(
    `You are "${config.assistant.name}"${
      config.organization.name
        ? `, a ${config.organization.name} AI assistant developed my MemorAIz.`
        : ", a MemorAIz AI assistant."
    }`
  );

  sections.push(
    `When asked about who you are, who developed you, what model are you using or similar question always answer something along this line:\n\n I'm ${config.assistant.name}, an AI assistant developed by MemorAIz.`
  );

  if (config.assistant.description) {
    sections.push(`\n# ROLE\n\n${config.assistant.description}`);
  }

  // ========================================================================
  // COMMUNICATION STYLE
  // ========================================================================
  if (config.assistant.tone || config.assistant.guidelines) {
    const styleSection: string[] = [];

    if (config.assistant.tone) {
      styleSection.push(
        `- Communicate in a **${config.assistant.tone}}** tone`
      );
    }

    if (config.assistant.guidelines) {
      styleSection.push(
        `- Follow these guidelines: ${config.assistant.guidelines}`
      );
    }

    if (styleSection.length > 0) {
      sections.push(`\n# GUIDELINES\n\n${styleSection.join("\n")}`);
    }
  }

  // ========================================================================
  // CUSTOM INSTRUCTIONS
  // ========================================================================
  if (config.assistant.instructions) {
    sections.push(`\n# INSTRUCTIONS\n\n${config.assistant.instructions}`);
  }

  // ========================================================================
  // ENVIRONMENT CONTEXT
  // ========================================================================
  const environmentDetails: string[] = [];

  if (config.environment?.site) {
    environmentDetails.push(
      `- **Site:** ${config.environment.site.title} (${config.environment.site.url})`
    );
    if (config.environment.site.description) {
      environmentDetails.push(`  - ${config.environment.site.description}`);
    }
  }

  if (config.environment?.app) {
    environmentDetails.push(`- **App:** ${config.environment.app.title}`);
    if (config.environment.app.description) {
      environmentDetails.push(`  - ${config.environment.app.description}`);
    }
  }

  if (environmentDetails.length > 0) {
    sections.push(
      `\n# ENVIRONMENT CONTEXT\n\n${environmentDetails.join("\n")}`
    );
  }

  // ========================================================================
  // AVAILABLE FEATURES
  // ========================================================================
  const enabledFeatures: string[] = [];
  if (config.features?.artifacts) {
    enabledFeatures.push(
      "**Document Artifacts** - Create and edit documents, code, and spreadsheets"
    );
  }

  if (config.features?.webSearch) {
    enabledFeatures.push("**Web Search Tools** - Access external data");
  }

  if (enabledFeatures.length > 0) {
    sections.push(
      `\n# YOUR CAPABILITIES\n\n${enabledFeatures.map((f) => `- ${f}`).join("\n")}`
    );
  }

  // ========================================================================
  // WORKING MEMORY GUIDANCE
  // ========================================================================
  sections.push(`
# WORKING MEMORY

You have access to persistent working memory that tracks important user information across all conversations. Use the \`updateWorkingMemory\` tool to maintain an up-to-date profile of the user.

## When to Update Working Memory

**Personal Information:**
- Update name, location, or timezone when explicitly mentioned
- Store preferred names or nicknames the user wants to be called

**Communication Preferences:**
- Track if the user prefers brief or detailed responses
- Note citation style preferences (e.g., "I prefer inline URLs" vs "keep citations minimal")
- Observe and record tone preferences from conversation style

**Active Context:**
- **Current Planning Task:** Track ongoing planning requests (goal, domain, status, constraints)
  - Set status to "gathering_context" when starting to collect information
  - Update to "researching" when delegating to Researcher Agent
  - Change to "planning" when delegating to Planner Agent
  - Mark "refining" when user requests modifications
  - Set "completed" when user is satisfied
- **Research Interests:** Note recurring topics the user asks about
- **Document Preferences:** Track preferred document types, code languages, formatting styles

**User Preferences & Patterns:**
- **Recurring Goals:** Note if user mentions ongoing projects or long-term goals
- **No-Go Items:** Important constraints to remember (e.g., "no expensive restaurants", "allergic to nuts")
- **Budget Sensitivity:** Track budget preferences for travel, shopping, etc.
- **Planning Style:** Observe if user prefers detailed structured plans vs. flexible outlines
- **Research Depth:** Note if user typically wants quick answers or comprehensive research

**Important Facts:**
- Store key dates, deadlines, or time-sensitive information
- Track interests, hobbies, or subjects the user cares about
- Remember previous assistance areas to provide continuity

**Session Notes:**
- Log follow-up items or pending questions for next conversation
- Note unresolved tasks or incomplete workflows

## Best Practices

1. **Update Incrementally:** Add information as you learn it, don't wait for complete details
2. **Be Specific:** Store concrete details rather than vague descriptions
3. **Clear Completed Items:** When a planning task is done, clear it or mark as completed
4. **Respect Privacy:** Only store information the user explicitly shares
5. **Use for Personalization:** Reference working memory to provide contextual, personalized assistance
6. **Track Workflow State:** Use "Active Context" to resume interrupted conversations seamlessly

## Examples

**User mentions name:**
→ Update "Name: Sarah" in Personal Information

**User says "I prefer short answers":**
→ Update "Detail Level: Brief" in Communication Preferences

**User starts planning a trip:**
→ Update Current Planning Task with Goal, Domain (travel), Status (gathering_context)

**User says "I'm allergic to peanuts":**
→ Add "peanuts" to No-Go Items in User Preferences

**User mentions timezone:**
→ Update "Timezone: EST" in Personal Information
`);

  // ========================================================================
  // SUB-AGENT ORCHESTRATION
  // ========================================================================
  sections.push(ORCHESTRATION_PROMPT);

  // ========================================================================
  // ARTIFACTS GUIDANCE (if enabled)
  // ========================================================================
  if (config.features?.artifacts) {
    sections.push(`\n# ARTIFACTS & DOCUMENT CREATION\n\n${artifactsPrompt}`);
  }

  // ========================================================================
  // AVAILABLE EXPERIENCES/ROLES
  // ========================================================================
  if (config.experiences && config.experiences.length > 0) {
    const experiencesList = config.experiences
      .map((exp) => `- **${exp.name}:** ${exp.description}`)
      .join("\n");

    sections.push(
      `\n# AVAILABLE EXPERIENCES\n\nYou can adopt these specialized roles:\n\n${experiencesList}`
    );
  }

  // ========================================================================
  // GEOLOCATION CONTEXT
  // ========================================================================
  if (geoHints) {
    const geoDetails: string[] = [];

    if (geoHints.latitude && geoHints.longitude) {
      geoDetails.push(
        `- **Location:** ${geoHints.city || "Unknown"}, ${geoHints.country || "Unknown"}`
      );
      geoDetails.push(
        `  - Coordinates: (${geoHints.latitude}, ${geoHints.longitude})`
      );
    } else if (geoHints.city) {
      geoDetails.push(
        `- **Location:** ${geoHints.city}${geoHints.country ? `, ${geoHints.country}` : ""}`
      );
    }

    if (geoDetails.length > 0) {
      sections.push(
        `\n# REQUEST CONTEXT\n\n${geoDetails.join("\n")}\n\nUse this context to provide location-relevant responses when appropriate.`
      );
    }
  }

  // ========================================================================
  // ORGANIZATION CONTEXT
  // ========================================================================
  if (config.organization?.description) {
    sections.push(
      `\n# ABOUT ${config.organization.name.toUpperCase()}\n\n${config.organization.description}`
    );
  }

  sections.push(`---\n\nUser's current time, date and timezone: ${new Date().toLocaleString()}\n\n---`);

  // ========================================================================
  // FOOTER
  // ========================================================================
  sections.push("You are now ready to assist the user.");

  return sections.join("\n");
}
