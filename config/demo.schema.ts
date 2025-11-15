import { z } from "zod";
import { THEME_COLOR_PRESETS } from "@/lib/branding/theme-presets";

const URL_BASE64_REGEX = /^data:image\/[a-zA-Z]+;base64,/;
/**
 * Enhanced URL validation that supports both absolute URLs, relative paths, and base64 data URLs
 */
const urlSchema = z
  .string()
  .refine(
    (value) => {
      // Allow empty strings
      if (!value) {
        return true;
      }

      // Allow base64 data URLs
      if (value.startsWith("data:")) {
        return URL_BASE64_REGEX.test(value);
      }

      // Allow HTTP(S) URLs
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    {
      message: "Must be a valid URL or base64 data URL",
    }
  )
  .optional();

/**
 * Branding configuration schema
 * Defines all customizable branding elements for white-labeling
 */
export const DemoConfigSchema = z.object({
  assistant: z.object({
    // profile
    name: z.string(),
    avatar: urlSchema,
    description: z.string().optional(),
    tone: z
      .enum(["friendly", "supportive", "excited", "informative"])
      .default("friendly"),
    // behaviour
    instructions: z.string().optional(),
    guidelines: z.string().optional(),
    roles: z.array(z.string()).default([]),
  }),
  appearance: z.object({
    // theme
    preset: z.enum(["default", "playful", "tech"]).default("default"),
    customCss: z.string().optional(),
    defaultMode: z.enum(["dark", "light", "auto"]).default("auto"),
    // assets
    favicon: urlSchema,
    logo: urlSchema,
    ogImage: urlSchema,
    authLogo: urlSchema,
  }),
  chat: z.object({
    suggestions: z.array(z.string()).default([]),
    // features:
    features: z.object({
      memory: z.boolean().default(true),
      webSearch: z.boolean().default(true),
      artifacts: z.boolean().default(true),
      multimodalInput: z.boolean().default(true),
    }),
  }),
  context: z.object({
    // organization
    organization: z
      .object({
        name: z.string(),
        description: z.string().optional(),
        websiteUrl: urlSchema.optional(),
      })
      .optional(),
    // app
    app: z
      .object({
        name: z.string(),
        description: z.string().optional(),
      })
      .optional(),
    // knowledgebase
    indexes: z.array(z.string()).default(["memoraiz"]),
  }),
  runtime: z.object({
    intents: z
      .array(z.object({ name: z.string(), description: z.string() }))
      .default([]),
    experiences: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          triggeredBy: z.string().nullable(), // intent
          triggerThreshold: z.number().min(0).max(1),
        })
      )
      .default([]),
  }),
});

/**
 * Schema for AI generation of demo config updates
 * This schema defines what fields the AI can modify and includes descriptions for guidance
 * Some fields are excluded because they should not be auto-generated (avatars, assets, etc.)
 */
export const DemoConfigMemorySchema = z.object({
  assistant: z
    .object({
      name: z
        .string()
        .describe(
          "The name of the AI assistant. Should be a professional, memorable name."
        ),
      description: z
        .string()
        .optional()
        .describe(
          "A brief description of the assistant's role and capabilities. Used in the UI to introduce the assistant."
        ),
      tone: z
        .enum(["friendly", "supportive", "excited", "informative"])
        .optional()
        .describe(
          'The communication style of the assistant. "friendly" is conversational, "supportive" is empathetic, "excited" is enthusiastic, "informative" is factual.'
        ),
      instructions: z
        .string()
        .optional()
        .describe(
          "System instructions that define how the assistant should behave, respond, and handle various situations."
        ),
      guidelines: z
        .string()
        .optional()
        .describe(
          "Guidelines and policies that the assistant should follow when interacting with users."
        ),
    })
    .optional()
    .describe("Configuration for the AI assistant's identity and behavior."),
  appearance: z
    .object({
      preset: z
        .enum(["default", "playful", "tech"])
        .optional()
        .describe(
          'Visual theme preset for the UI. "default" is neutral, "playful" is colorful and friendly, "tech" is modern and sleek.'
        ),
      themeColor: z
        .enum(THEME_COLOR_PRESETS.map((p) => p.id) as [string, ...string[]])
        .optional()
        .describe(
          "The color theme to use. Options include various named color schemes."
        ),
    })
    .optional()
    .describe(
      "Configuration for the application's visual appearance and theme."
    ),
  chat: z
    .object({
      suggestions: z
        .array(z.string())
        .optional()
        .describe(
          "List of suggested starter prompts that users can click to begin conversations."
        ),
    })
    .optional()
    .describe("Configuration for chat interface and user experience."),
  context: z
    .object({
      organization: z
        .object({
          name: z.string().optional().describe("The name of the organization."),
          description: z
            .string()
            .optional()
            .describe(
              "A brief description of the organization and its mission."
            ),
          websiteUrl: z
            .string()
            .url()
            .optional()
            .describe("The organization's official website URL."),
        })
        .optional()
        .describe("Information about the organization or company."),
      app: z
        .object({
          name: z
            .string()
            .optional()
            .describe("The name of the application or product."),
          description: z
            .string()
            .optional()
            .describe(
              "A brief description of what the application does and its purpose."
            ),
        })
        .optional()
        .describe("Information about the application being configured."),
    })
    .optional()
    .describe("Context information about the organization and application."),
  runtime: z
    .object({
      intents: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'The name of the intent (e.g., "help", "feedback", "report_bug").'
              ),
            description: z
              .string()
              .describe(
                "Description of what this intent represents and when it should be triggered."
              ),
          })
        )
        .optional()
        .describe(
          "List of user intents that the assistant can recognize and handle."
        ),
      experiences: z
        .array(
          z.object({
            name: z
              .string()
              .describe("The name of the experience or interaction flow."),
            description: z
              .string()
              .describe(
                "Description of the experience and what it provides to the user."
              ),
            triggeredBy: z
              .string()
              .nullable()
              .optional()
              .describe(
                "The intent that triggers this experience. Should match an intent name."
              ),
            triggerThreshold: z
              .number()
              .min(0)
              .max(1)
              .optional()
              .describe(
                "Confidence threshold (0-1) required to trigger this experience. Higher values require higher confidence."
              ),
          })
        )
        .optional()
        .describe(
          "List of custom experiences or interaction flows triggered by specific intents."
        ),
    })
    .optional()
    .describe("Runtime configuration for intents and custom experiences."),
});

/**
 * Branding configuration type inferred from schema
 */
export type DemoConfig = z.infer<typeof DemoConfigSchema>;
export type DemoConfigMemory = z.infer<typeof DemoConfigMemorySchema>;
