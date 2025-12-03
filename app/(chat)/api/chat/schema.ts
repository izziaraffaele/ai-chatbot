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
 * Viewed content schema for content being displayed within a complex widget.
 * This represents what the user is actually seeing on screen.
 */
const viewedContentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  content: z.string(),
  contentType: z.enum(["markdown", "text", "csv", "json"]).optional(),
});

/**
 * Canvas context schema for passing active tab information to agents.
 * This allows agents to answer questions about the currently open document.
 */
const activeTabSchema = z.object({
  title: z.string(),
  kind: z.string(),
  documentId: z.string().optional(),
  content: z.unknown().optional(), // Can be string, CSV data, etc.
  viewedContent: viewedContentSchema.optional(), // Content viewed within complex widgets
});

export const canvasContextSchema = z
  .object({
    activeTab: activeTabSchema.nullable(),
  })
  .optional();

export type CanvasContext = z.infer<typeof canvasContextSchema>;

export const postRequestBodySchema = z.object({
  id: z.uuid(),
  message: z.union([userMessageSchema, assistantMessageSchema]),
  selectedVisibilityType: z.enum(["public", "private"]),
  runtimeConfig: RuntimeConfigSchema.partial(),
  tools: z.record(z.string(), z.any()).optional(),
  agentId: z.string().optional(), // Agent registry ID (e.g., "chatAgent", "sfcAsseAgent")
  canvasContext: canvasContextSchema, // Active canvas tab info for document-aware responses
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
