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

export const postRequestBodySchema = z.object({
  id: z.uuid(),
  message: z.union([userMessageSchema, assistantMessageSchema]),
  selectedVisibilityType: z.enum(["public", "private"]),
  runtimeConfig: RuntimeConfigSchema.partial(),
  tools: z.record(z.string(), z.any()).optional(),
  agentId: z.string().optional(), // Agent registry ID (e.g., "chatAgent", "sfcAsseAgent")
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
