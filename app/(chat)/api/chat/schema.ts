import { isToolUIPart } from "ai";
import { z } from "zod";
import { RuntimeConfigSchema } from "@/config/runtime.schema";
import { messageMetadataSchema } from "@/lib/types";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.url(),
});

const userMessageSchema = z.object({
  id: z.uuid(),
  role: z.literal("user"),
  parts: z.array(z.union([textPartSchema, filePartSchema])),
  metadata: messageMetadataSchema.optional(),
});

const assistantMessageSchema = z.object({
  id: z.uuid(),
  role: z.literal("assistant"),
  parts: z.array(z.unknown()).transform((v) => v.filter(isToolUIPart)),
  metadata: messageMetadataSchema.optional(),
});

/**
 * PF Builder state snapshot schema
 * Represents the current state of the PF Builder for chat context
 */
const pfBuilderUfSnapshotSchema = z.object({
  id: z.string(),
  nome: z.string(),
  descrizione: z.string().optional(),
  settore: z.string().nullable(),
  figura: z.string().nullable(),
  figuraDescrizione: z.string().optional(),
  adaCount: z.number(),
  adaNames: z.array(z.string()),
  isComplete: z.boolean(),
});

export const pfBuilderStateSnapshotSchema = z.object({
  isActive: z.boolean(),
  step: z.enum([
    "SELECT_TYPE",
    "UF_INPUT",
    "UF_SECTOR",
    "UF_FIGURE",
    "UF_ADA",
    "ADA_DETAILS",
    "SUMMARY",
  ]),
  tipo: z.enum(["qualifica", "certificazione"]).nullable(),
  titolo: z.string(),
  unitaFormative: z.array(pfBuilderUfSnapshotSchema),
});

export type PFBuilderStateSnapshotAPI = z.infer<
  typeof pfBuilderStateSnapshotSchema
>;

export const postRequestBodySchema = z.object({
  id: z.uuid(),
  message: z.union([userMessageSchema, assistantMessageSchema]),
  selectedVisibilityType: z.enum(["public", "private"]),
  runtimeConfig: RuntimeConfigSchema.partial(),
  tools: z.record(z.string(), z.any()).optional(),
  pfBuilderState: pfBuilderStateSnapshotSchema.optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
