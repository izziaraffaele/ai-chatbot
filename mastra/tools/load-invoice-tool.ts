/**
 * Load Invoice Tool
 *
 * Allows the chat agent to load invoice files from the Faenza knowledge base.
 * Supports both local XML files and remote Oracle database as data sources.
 * Includes validation for required invoice fields (IBAN, CIG, CUP, etc.)
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  findRecordSuggestions,
  getDataSource,
  getFileSystemHierarchy,
  type InvoiceMetadata,
  loadRecord,
} from "../utils/knowledge-base-loader";
import { setLoadedInvoice } from "../utils/runtime-utils";

/**
 * Maximum content size to return (in characters)
 * Prevents agent stream errors with large XML files
 */
const MAX_CONTENT_SIZE = 60_000;

/**
 * Validation schema for individual fields
 */
const validationSchema = z.object({
  iban: z.string().nullable(),
  cig: z.string().nullable(),
  cup: z.string().nullable(),
  codiceFornitore: z.string().nullable(),
  importoSpesa: z.number().nullable(),
  descrizioneSpesa: z.string().nullable(),
  codicePA: z.string().nullable(),
  codiceFiscale: z.string().nullable(),
  fatturaValida: z.boolean(),
  campiMancanti: z.array(z.string()),
  campiNonValidi: z.array(z.string()),
});

/**
 * File info with validation status for listing
 */
const fileWithValidationSchema = z.object({
  fileId: z.string(),
  displayName: z.string().optional(),
  fatturaValida: z.boolean(),
  campiMancanti: z.array(z.string()),
  campiNonValidi: z.array(z.string()),
});

/**
 * File system file schema
 */
const fileSystemFileSchema: z.ZodType<unknown> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal("file"),
  fileId: z.string(),
  displayName: z.string().optional(),
  fatturaValida: z.boolean(),
  campiMancanti: z.array(z.string()),
  campiNonValidi: z.array(z.string()),
  source: z.enum(["local", "oracle"]),
});

/**
 * File system folder schema (recursive)
 */
const fileSystemFolderSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.literal("folder"),
    children: z.array(z.union([fileSystemFileSchema, fileSystemFolderSchema])),
    fileCount: z.number(),
    validCount: z.number(),
    invalidCount: z.number(),
    defaultExpanded: z.boolean().optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
  })
);

/**
 * File system item schema
 */
const fileSystemItemSchema = z.union([
  fileSystemFileSchema,
  fileSystemFolderSchema,
]);

/**
 * File system root schema
 */
const fileSystemRootSchema = z.object({
  items: z.array(fileSystemItemSchema),
  totalFiles: z.number(),
  totalValid: z.number(),
  totalInvalid: z.number(),
});

/**
 * Output schema for the load invoice tool
 */
const invoiceOutputSchema = z.object({
  success: z.boolean(),
  /** Canonical record identifier for re-loading (e.g., "sibac-shared:path/to/file.xml") */
  recordId: z.string().optional(),
  error: z.string().optional(),
  metadata: z
    .object({
      fileId: z.string(),
      fileName: z.string(),
      supplier: z.string().optional(),
      supplierVatId: z.string().optional(),
      buyer: z.string().optional(),
      buyerVatId: z.string().optional(),
      date: z.string().optional(),
      invoiceNumber: z.string().optional(),
      documentType: z.string().optional(),
      totalAmount: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  content: z.string().optional(),
  truncated: z.boolean().optional(),
  originalSize: z.number().optional(),
  // List of available files (legacy, kept for compatibility)
  availableFiles: z.array(z.string()).optional(),
  // Files with validation status (legacy flat format)
  filesWithValidation: z.array(fileWithValidationSchema).optional(),
  // NEW: Hierarchical file system structure
  fileSystem: fileSystemRootSchema.optional(),
  // Validation details for loaded invoice
  validation: validationSchema.optional(),
});

export type LoadInvoiceOutput = z.infer<typeof invoiceOutputSchema>;

/**
 * Load Invoice Tool
 *
 * Loads invoice data from the configured data source (local XML files or Oracle database).
 * Supports partial matching for flexible file lookups.
 *
 * When listing files (no fileId), returns validation status for each file.
 * When loading a file, returns full validation details.
 *
 * Validation checks:
 * - IBAN: present and valid Italian format (27 chars starting with IT)
 * - CIG: present and valid format (10 alphanumeric chars)
 * - CUP: present and valid format (15 alphanumeric chars)
 * - Codice Fornitore: present (supplier VAT ID)
 * - Importo Spesa: present (total amount)
 * - Descrizione Spesa: present (Causale or Descrizione)
 * - Codice PA: present and valid format (6-7 alphanumeric chars)
 * - Codice Fiscale: present and valid format (11 digits or 16 chars)
 *
 * Data sources:
 * - "local": XML invoice files from mastra/knowledgebase/faenza/
 * - "oracle": SIB_V_IMPEGNI_X_CIG view from SIBAC database (via VPN)
 */
export const loadInvoiceTool = createTool({
  id: "loadInvoice",
  description: `Load an invoice or impegno from the Faenza knowledge base with validation.
Provide a file identifier to load a specific document.
Use this tool when the user wants to work on, analyze, or view a specific invoice or impegno.

IMPORTANT: File identifier formats:
- For SIBAC shared files: ALWAYS pass the COMPLETE path starting with "sibac-shared:" prefix.
  Example: "sibac-shared:Faenza/repositoryFE/XMLP/2023/08/21/CSB_xxx.xml"
  NEVER truncate or extract just the filename - pass the ENTIRE string as provided by the user.
- For local XML files: use file names like "CSB_IT00185240397_00IS8" or VAT numbers.
- For Oracle database: use CIG codes or impegno identifiers.

If no fileId is provided, returns a list of available records with their validation status.

The tool validates each record for:
- IBAN, CIG, CUP (presence and format)
- Codice Fornitore, Importo, Descrizione (presence)
- Codice PA, Codice Fiscale (presence and format)

Returns fatturaValida=true only if ALL fields are present and valid.
For invalid records, campiMancanti lists missing fields and campiNonValidi lists fields with invalid format.`,
  inputSchema: z.object({
    fileId: z
      .string()
      .optional()
      .describe(
        "The invoice/impegno identifier. For sibac-shared files, pass the COMPLETE path including 'sibac-shared:' prefix (e.g., 'sibac-shared:Faenza/repositoryFE/XMLP/2023/file.xml'). NEVER truncate paths - pass them exactly as provided."
      ),
  }),
  outputSchema: invoiceOutputSchema,
  execute: async ({ context, runtimeContext }) => {
    const { fileId } = context as { fileId?: string };
    const dataSource = getDataSource();

    console.log(`[LoadInvoice] Using data source: ${dataSource}`);

    // If no fileId provided, list available files with hierarchical structure
    if (!fileId) {
      try {
        // Get hierarchical file system with both local and Oracle folders
        const fileSystem = await getFileSystemHierarchy();

        // Also extract flat list for backward compatibility
        const flattenFiles = (
          items: typeof fileSystem.items
        ): typeof fileSystem.items => {
          const files: typeof fileSystem.items = [];
          for (const item of items) {
            if (item.type === "file") {
              files.push(item);
            } else if (item.type === "folder") {
              files.push(...flattenFiles(item.children));
            }
          }
          return files;
        };

        const allFiles = flattenFiles(fileSystem.items);
        const filesWithValidation = allFiles
          .filter((f): f is typeof f & { type: "file" } => f.type === "file")
          .map((f) => ({
            fileId: f.fileId,
            displayName: f.displayName,
            fatturaValida: f.fatturaValida,
            campiMancanti: f.campiMancanti,
            campiNonValidi: f.campiNonValidi,
          }));
        const availableFiles = filesWithValidation.map((f) => f.fileId);

        return {
          success: true,
          availableFiles,
          filesWithValidation,
          fileSystem,
          metadata: undefined,
          content: undefined,
        };
      } catch (error) {
        console.error("[LoadInvoice] Error listing records:", error);
        return {
          success: false,
          error: `Errore nel caricamento dei documenti: ${error}`,
        };
      }
    }

    // Try to load the record
    try {
      console.log(`[LoadInvoice] Attempting to load: ${fileId}`);
      let record = await loadRecord(fileId);

      // Fallback: if not found and fileId looks like a filename (not a full path),
      // try searching in sibac-shared with the filename
      if (!record && !fileId.includes("/") && !fileId.startsWith("sibac-shared:")) {
        console.log(`[LoadInvoice] Not found, trying sibac-shared fallback for: ${fileId}`);
        // Try with sibac-shared prefix (simple filename case)
        record = await loadRecord(`sibac-shared:${fileId}`);
      }

      if (!record) {
        // Find suggestions
        const suggestions = await findRecordSuggestions(fileId);

        return {
          success: false,
          error: `Nessun documento trovato per "${fileId}".${
            suggestions.length > 0
              ? ` Forse intendevi: ${suggestions.join(", ")}?`
              : " Usa questo strumento senza fileId per vedere tutti i documenti disponibili."
          }`,
          availableFiles: suggestions.length > 0 ? suggestions : [],
        };
      }

      // Store the loaded invoice in runtime context for use by document templates
      if (runtimeContext) {
        setLoadedInvoice(runtimeContext, {
          metadata: record.metadata,
          validation: record.validation,
          content: record.content,
        });
      }

      // Check if content needs to be truncated to prevent agent stream errors
      const originalSize = record.content.length;
      const isTruncated = originalSize > MAX_CONTENT_SIZE;
      const content = isTruncated
        ? `${record.content.slice(0, MAX_CONTENT_SIZE)}\n\n<!-- CONTENT TRUNCATED: Original size ${originalSize} characters. Showing first ${MAX_CONTENT_SIZE} characters. -->`
        : record.content;

      return {
        success: true,
        recordId: record.recordId,
        metadata: record.metadata as InvoiceMetadata,
        content,
        truncated: isTruncated,
        originalSize: isTruncated ? originalSize : undefined,
        validation: record.validation,
      };
    } catch (error) {
      console.error("[LoadInvoice] Error loading record:", error);
      return {
        success: false,
        error: `Errore nel caricamento del documento: ${error}`,
      };
    }
  },
});
