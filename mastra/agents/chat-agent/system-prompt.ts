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
    `You are **${config.assistant.name}**${
      config.organization.name
        ? `, a ${config.organization.name} AI assistant`
        : ''
    }.`
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
      sections.push(`\n# COMMUNICATION STYLE\n\n${styleSection.join('\n')}`);
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
  if (config.features?.memory) {
    enabledFeatures.push(
      '**Conversation Memory** - Maintain context across messages'
    );
  }
  if (config.features?.webSearch) {
    enabledFeatures.push('**Information Tools** - Access external data');
  }
  if (config.features?.multimodalInput) {
    enabledFeatures.push('**Multimodal Input** - Process text and images');
  }

  if (enabledFeatures.length > 0) {
    sections.push(
      `\n# YOUR CAPABILITIES\n\n${enabledFeatures.map((f) => `- ${f}`).join('\n')}`
    );
  }

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
