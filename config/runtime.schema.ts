import { z } from 'zod';

/**
 * Branding configuration schema
 * Defines all customizable branding elements for white-labeling
 */
export const RuntimeConfigSchema = z.object({
  organization: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  assistant: z.object({
    name: z.string(),
    description: z.string().optional(),
    tone: z.string().optional(),
    instructions: z.string().optional(),
    guidelines: z.string().optional(),
    roles: z.array(z.string()).default([]),
  }),
  environment: z
    .object({
      site: z
        .object({
          title: z.string(),
          description: z.string(),
          url: z.url(),
        })
        .optional(),
      app: z
        .object({
          title: z.string(),
          description: z.string(),
          url: z.url().optional(),
        })
        .optional(),
    })
    .default({}),
  features: z
    .object({
      memory: z.boolean().default(true),
      webSearch: z.boolean().default(true),
      artifacts: z.boolean().default(true),
      multimodalInput: z.boolean().default(true),
    })
    .default({
      memory: true,
      webSearch: true,
      artifacts: true,
      multimodalInput: true,
    }),
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
});

/**
 * Branding configuration type inferred from schema
 */
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;
