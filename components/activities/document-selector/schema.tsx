import { z } from "zod";
import type { ModelActivity, UIActivity } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

/** Document processing status */
export const DocumentStatusSchema = z.enum([
  "completato",
  "in_elaborazione",
  "in_attesa",
]);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

// Schema for UI components - document with display info
export const UIDocumentSchema = z.object({
  /** Document file ID */
  fileId: z.string(),
  /** Display name for the document */
  displayName: z.string(),
  /** Secondary code/identifier */
  code: z.string().optional(),
  /** File size in bytes */
  size: z.number().optional(),
  /** Document date (ISO string) */
  date: z.string().optional(),
  /** Processing status */
  status: DocumentStatusSchema.optional(),
});

// Schema for AI model generation - just the file IDs
export const ModelDocumentSchema = z.object({
  fileId: z.string().describe("The document file identifier"),
  displayName: z
    .string()
    .optional()
    .describe("Optional friendly display name for the document"),
  code: z.string().optional().describe("Secondary code or identifier"),
  size: z.number().optional().describe("File size in bytes"),
  date: z.string().optional().describe("Document date in ISO format"),
  status: DocumentStatusSchema.optional().describe(
    "Processing status: completato, in_elaborazione, or in_attesa"
  ),
});

// Types for individual documents
export type UIDocument = z.infer<typeof UIDocumentSchema>;
export type ModelDocument = z.infer<typeof ModelDocumentSchema>;

// Activity types
export type UIDocumentSelectorActivity = UIActivity<
  "document-selector",
  UIDocument[]
>;
export type ModelDocumentSelectorActivity = ModelActivity<
  "document-selector",
  ModelDocument[]
>;

/**
 * Extracts a display-friendly name from a file ID
 * E.g., "CSB_IT00185240397_00IS8-[1796150500]" -> "IT00185240397"
 */
function getDisplayName(fileId: string): string {
  // Try to extract the VAT number portion (IT followed by digits)
  const vatMatch = fileId.match(/IT\d+/);
  if (vatMatch) {
    return vatMatch[0];
  }

  // Fallback: use first part before underscore or the whole ID
  const parts = fileId.split("_");
  if (parts.length > 1) {
    return parts.slice(0, 2).join("_");
  }

  return fileId.slice(0, 20);
}

/**
 * Extracts a secondary code from a file ID
 * E.g., "CSB_IT00185240397_00IS8-[1796150500]" -> "A-[1796150500]"
 */
function getCodeFromFileId(fileId: string): string {
  const bracketMatch = fileId.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    return `A-[${bracketMatch[1]}]`;
  }
  return fileId.slice(-12);
}

// Conversion function from Model to UI
export function toUIDocumentSelectorActivity({
  payload,
  ...source
}: ModelDocumentSelectorActivity): UIDocumentSelectorActivity {
  // Filter out incomplete items during streaming
  const validItems = (payload || []).filter(
    (item): item is ModelDocument => Boolean(item?.fileId)
  );

  return {
    id: generateUUID(),
    objectives: [],
    payload: validItems.map((item) => ({
      fileId: item.fileId,
      displayName: item.displayName || getDisplayName(item.fileId),
      code: item.code || getCodeFromFileId(item.fileId),
      size: item.size,
      date: item.date,
      status: item.status || "completato",
    })),
    ...source,
  };
}

