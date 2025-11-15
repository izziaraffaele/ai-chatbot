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

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.uuid(),
  message: z.object({
    id: z.uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
    metadata: messageMetadataSchema.optional(),
  }),
  selectedVisibilityType: z.enum(["public", "private"]),
  runtimeConfig: RuntimeConfigSchema.partial(),
  tools: z.record(z.string(), z.any()).optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
