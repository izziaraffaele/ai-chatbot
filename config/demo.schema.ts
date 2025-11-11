import { z } from 'zod/v4';

/**
 * Enhanced URL validation that supports both absolute URLs and relative paths
 */
const urlSchema = z.url()

/**
 * Branding configuration schema
 * Defines all customizable branding elements for white-labeling
 */
export const DemoConfigSchema = z.object({
  assistant:z.object({
    // profile
    name: z.string(),
    avatar: urlSchema.optional(),
    description: z.string().optional(),
    tone: z.enum([
      'friendly',
      'supportive',
      'excited',
      'informative',
    ]).default('friendly'),
    // behaviour
    instructions: z.string().optional(),
    guidelines: z.string().optional(),
    roles: z.array(z.string()).default([]),
  }),
  appearance: z.object({
    // theme
    preset: z.enum(['default', 'playful', 'tech']).default('default'),
    customCss: z.string().optional(),
    defaultMode: z.enum(['dark', 'light', 'auto']).default('auto'),
    // assets
    favicon: urlSchema.optional(),
    logo: urlSchema.optional(),
    ogImage: urlSchema.optional(),
    authLogo: urlSchema.optional(),
  }),
  chat: z.object({
    suggestions: z.array(z.string()).default([]),
    // features:
    features: z.object({
      memory: z.boolean().default(true),
      webSearch: z.boolean().default(true),
      artifacts: z.boolean().default(true),
      multimodalInput: z.boolean().default(true)
    }),
  }),
  context: z.object({
    // organization
    organization: z.object({
      name: z.string(),
      description: z.string().optional(),
      websiteUrl: urlSchema.optional(),
    }).optional(),
    // app
    app: z.object({
      name: z.string(),
      description: z.string().optional(),
    }).optional(),
    // knowledgebase
    indexes: z.array(z.string()).default(['memoraiz']),
  }),
  runtime: z.object({
    intents: z.array(z.object({ name: z.string(), description: z.string() })).default([]),
    experiences: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        triggeredBy: z.string().nullable(), // intent
        triggerThreshold: z.number().min(0).max(1)
      })
    ).default([])
  })
});

/**
 * Branding configuration type inferred from schema
 */
export type DemoConfig = z.infer<typeof DemoConfigSchema>;
