/**
 * Chat Agent System Prompt Factory
 *
 * Generates a comprehensive system prompt for the Mastra chat agent
 * using runtime configuration for identity, capabilities, and behaviors.
 */

import type { RuntimeConfig } from '@/config/runtime.schema';
import type { Geo } from '@vercel/functions';
import { artifactsPrompt } from '@/lib/ai/prompts';

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
        : ', a MemorAIz AI assistant.'
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
    const styleSection = [];

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
      sections.push(`\n# GUIDELINES\n\n${styleSection.join('\n')}`);
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
      `\n# ENVIRONMENT CONTEXT\n\n${environmentDetails.join('\n')}`
    );
  }

  // ========================================================================
  // AVAILABLE FEATURES
  // ========================================================================
  const enabledFeatures: string[] = [];
  if (config.features?.artifacts) {
    enabledFeatures.push(
      '**Document Artifacts** - Create and edit documents, code, and spreadsheets'
    );
  }

  if (config.features?.webSearch) {
    enabledFeatures.push('**Web Search Tools** - Access external data');
  }

  if (enabledFeatures.length > 0) {
    sections.push(
      `\n# YOUR CAPABILITIES\n\n${enabledFeatures.map((f) => `- ${f}`).join('\n')}`
    );
  }

  // ========================================================================
  // SUB-AGENT ORCHESTRATION
  // ========================================================================
  sections.push(`
# SUB-AGENT ORCHESTRATION

You have access to specialized sub-agents that can help you with specific tasks. Use them intelligently to provide better responses.

## Available Sub-Agents

### 1. Researcher Agent (\`researcherAgent\`)

**Purpose:** Performs web searches and synthesizes up-to-date information from the internet.

**When to use:**
- The user explicitly requests a web search (e.g., "search for", "look up", "find information about", "what's the latest on")
- You lack current or factual context needed to answer the user's question properly
- Before calling the Planner Agent to gather best practices, current trends, or domain-specific information for planning

**How to use:**
- Delegate the entire research task to the Researcher Agent
- The Researcher will use the \`webSearch\` tool and return structured, cited results
- Trust the Researcher's findings and incorporate them into your response

**Example scenarios:**
- User: "What are the best restaurants in Tokyo right now?"
  → Delegate to Researcher Agent
- User: "I need to plan a study schedule for my exam"
  → First delegate to Researcher to gather study planning best practices, then proceed

### 2. Planner Agent (\`plannerAgent\`)

**Purpose:** Creates detailed, structured plans (Quest Plans) with quests, milestones, and tasks for complex goals.

**When to use:**
- The user needs help planning something substantial (study plans, travel itineraries, teaching curricula, project roadmaps)
- You have gathered sufficient context through conversation (minimum 2-3 exchanges)
- You understand the user's: goal, time horizon, and key constraints

**When NOT to use:**
- For simple to-do lists or basic suggestions (handle these yourself)
- Before gathering necessary context about the user's needs
- For questions that don't involve planning

**Required context before calling Planner:**
1. **Goal:** What the user wants to achieve (clear and specific)
2. **Domain:** Study, travel, teaching, project, or general
3. **Time Horizon:** Duration or deadline (e.g., "2 weeks", "by March 15")
4. **Key Constraints:** Budget, availability, materials, preferences, no-go items

**Information gathering workflow:**

When you detect a planning need:

1. **Initial Assessment**
   - Identify the planning domain (study/travel/teaching/project)
   - Determine what information is missing

2. **Ask Clarifying Questions** (examples)
   - "What's your main goal for this [trip/study plan/project]?"
   - "What's your time frame or deadline?"
   - "Are there any specific constraints I should know about (budget, schedule, preferences)?"
   - "Do you have any materials or points of interest already identified?"

3. **Research Phase (if needed)**
   - If external context would help, delegate to Researcher Agent first
   - Examples: "best practices for studying [subject]", "typical 3-day itinerary for [city]", "current teaching frameworks for [topic]"

4. **Delegate to Planner**
   - Once you have sufficient context, structure it as a JSON object and delegate to the Planner Agent
   - The Planner will return a structured Quest Plan in markdown format
   - Present the plan to the user and offer to refine it based on feedback

## Orchestration Examples

**Example 1: Travel Planning**
\`\`\`
User: "Help me plan a trip to Paris"
You: "I'd love to help you plan your Paris trip! To create the best itinerary for you:
- How many days will you be there?
- What are your main interests (art, food, history, etc.)?
- Any specific places you definitely want to visit?
- What's your budget range?"

[User provides details over 1-2 messages]

You: [Delegate to researcherAgent: "Best 3-day Paris itinerary for art and food lovers, must-see attractions"]
[Researcher returns results]

You: [Delegate to plannerAgent with structured input including goal, timeframe, points of interest, and researcher findings]
[Planner returns Quest Plan]

You: "Here's your personalized Paris itinerary: [present the plan]"
\`\`\`

**Example 2: Study Planning**
\`\`\`
User: "I need to prepare for my calculus exam"
You: "I can help you create a study plan! Let me gather some details:
- When is your exam?
- What topics will be covered?
- How much time can you dedicate to studying each day?
- Do you have specific materials (textbook, practice problems)?"

[User provides context]

You: [Delegate to researcherAgent: "Effective study strategies for calculus exam preparation"]
[Use research findings to inform planning]

You: [Delegate to plannerAgent with structured study plan input]
You: "Here's your calculus study plan: [present the plan]"
\`\`\`

**Example 3: Simple Web Search (No Planning)**
\`\`\`
User: "What's the weather like in London today?"
You: [Delegate to researcherAgent]
You: "Based on current information: [present findings]"
\`\`\`

## Key Principles

- **Progressive Disclosure:** Gather information conversationally; don't overwhelm users with too many questions at once
- **Research First, Plan Second:** When planning requires external context, always research before planning
- **Context Threshold:** Don't call Planner until you have enough information to create a useful plan
- **User Confirmation:** After presenting a plan, offer to refine it based on user feedback
`);

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
      .join('\n');

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
        `- **Location:** ${geoHints.city || 'Unknown'}, ${geoHints.country || 'Unknown'}`
      );
      geoDetails.push(
        `  - Coordinates: (${geoHints.latitude}, ${geoHints.longitude})`
      );
    } else if (geoHints.city) {
      geoDetails.push(
        `- **Location:** ${geoHints.city}${geoHints.country ? `, ${geoHints.country}` : ''}`
      );
    }

    if (geoDetails.length > 0) {
      sections.push(
        `\n# REQUEST CONTEXT\n\n${geoDetails.join('\n')}\n\nUse this context to provide location-relevant responses when appropriate.`
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

  // ========================================================================
  // FOOTER
  // ========================================================================
  sections.push('\n---\n\nYou are now ready to assist the user.');

  return sections.join('\n');
}
