/**
 * Load Invoice Tool
 *
 * Allows the chat agent to load invoice files from the Faenza knowledge base.
 * The tool supports partial matching for flexible file lookups.
 * Includes validation for required invoice fields (IBAN, CIG, CUP, etc.)
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  type InvoiceMetadata,
  listKnowledgeBaseFiles,
  loadKnowledgeBaseFile,
  VALIDATION_FIELD_NAMES,
  validateInvoice,
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
  fatturaValida: z.boolean(),
  campiMancanti: z.array(z.string()),
  campiNonValidi: z.array(z.string()),
});

/**
 * Output schema for the load invoice tool
 */
const invoiceOutputSchema = z.object({
  success: z.boolean(),
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
  // NEW: Files with validation status
  filesWithValidation: z.array(fileWithValidationSchema).optional(),
  // NEW: Validation details for loaded invoice
  validation: validationSchema.optional(),
});

export type LoadInvoiceOutput = z.infer<typeof invoiceOutputSchema>;

/**
 * Load Invoice Tool
 *
 * Loads an invoice XML file from the Faenza knowledge base by file ID.
 * Supports partial matching - you can provide part of the file name.
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
 * Example inputs:
 * - "CSB_IT00185240397_00IS8-[1796150500]" (full ID)
 * - "CSB_IT00185240397" (partial ID)
 * - "00185240397" (VAT number only)
 */
export const loadInvoiceTool = createTool({
  id: "loadInvoice",
  description: `Load an invoice file from the Faenza knowledge base with validation.
Provide a file identifier (can be partial - the tool will find matching files).
Use this tool when the user wants to work on, analyze, or view a specific invoice.
Examples of valid inputs: "CSB_IT00185240397_00IS8", "CSB_IT00185240397", or just the VAT number "00185240397".
If no fileId is provided, returns a list of available invoice files with their validation status.

The tool validates each invoice for:
- IBAN, CIG, CUP (presence and format)
- Codice Fornitore, Importo, Descrizione (presence)
- Codice PA, Codice Fiscale (presence and format)

Returns fatturaValida=true only if ALL fields are present and valid.
For invalid invoices, campiMancanti lists missing fields and campiNonValidi lists fields with invalid format.`,
  inputSchema: z.object({
    fileId: z
      .string()
      .optional()
      .describe(
        "The invoice file identifier (partial or full). If omitted, lists all available files with validation status."
      ),
  }),
  outputSchema: invoiceOutputSchema,
  execute: async ({ context, runtimeContext }) => {
    const { fileId } = context as { fileId?: string };

    // Mastra requires async execute, await here to satisfy linter
    const availableFiles = await Promise.resolve(listKnowledgeBaseFiles());

    // If no fileId provided, list available files with validation status
    if (!fileId) {
      const filesWithValidation = availableFiles.map((id) => {
        const invoice = loadKnowledgeBaseFile(id);
        if (invoice) {
          const validation = validateInvoice(invoice.content);
          return {
            fileId: id,
            fatturaValida: validation.fatturaValida,
            campiMancanti: validation.campiMancanti.map(
              (field) => VALIDATION_FIELD_NAMES[field] || field
            ),
            campiNonValidi: validation.campiNonValidi.map(
              (field) => VALIDATION_FIELD_NAMES[field] || field
            ),
          };
        }
        return {
          fileId: id,
          fatturaValida: false,
          campiMancanti: ["Impossibile caricare il file"],
          campiNonValidi: [],
        };
      });

      return {
        success: true,
        availableFiles,
        filesWithValidation,
        metadata: undefined,
        content: undefined,
      };
    }

    // Try to load the invoice
    const invoice = loadKnowledgeBaseFile(fileId);

    if (!invoice) {
      // Find similar files for suggestions
      const searchTerm = fileId.toUpperCase();
      const suggestions = availableFiles
        .filter((f) => f.toUpperCase().includes(searchTerm.slice(0, 10)))
        .slice(0, 5);

      return {
        success: false,
        error: `No invoice found matching "${fileId}".${
          suggestions.length > 0
            ? ` Did you mean one of these: ${suggestions.join(", ")}?`
            : " Use this tool without a fileId to see all available files."
        }`,
        availableFiles:
          suggestions.length > 0 ? suggestions : availableFiles.slice(0, 10),
      };
    }

    // Validate the invoice
    const validation = validateInvoice(invoice.content);

    // Store the loaded invoice in runtime context for use by document templates
    if (runtimeContext) {
      setLoadedInvoice(runtimeContext, {
        metadata: invoice.metadata,
        validation,
        content: invoice.content,
      });
    }

    // Check if content needs to be truncated to prevent agent stream errors
    const originalSize = invoice.content.length;
    const isTruncated = originalSize > MAX_CONTENT_SIZE;
    const content = isTruncated
      ? `${invoice.content.slice(0, MAX_CONTENT_SIZE)}\n\n<!-- CONTENT TRUNCATED: Original size ${originalSize} characters. Showing first ${MAX_CONTENT_SIZE} characters. -->`
      : invoice.content;

    return {
      success: true,
      metadata: invoice.metadata as InvoiceMetadata,
      content,
      truncated: isTruncated,
      originalSize: isTruncated ? originalSize : undefined,
      validation: {
        ...validation,
        // Convert field keys to human-readable Italian names for display
        campiMancanti: validation.campiMancanti.map(
          (field) => VALIDATION_FIELD_NAMES[field] || field
        ),
        campiNonValidi: validation.campiNonValidi.map(
          (field) => VALIDATION_FIELD_NAMES[field] || field
        ),
      },
    };
  },
});
