/**
 * Invoice Validation Tools
 *
 * Tools for validating extracted invoice field values.
 * Used by the Invoice Analyzer Agent to validate fields found in non-standard XML locations.
 *
 * Each tool:
 * - Takes the extracted value as input
 * - Runs regex validation from knowledge-base-loader.ts
 * - Returns validation result with cleaned value
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  isValidCIG,
  isValidCodiceDestinatario,
  isValidCodiceFiscale,
  isValidCUP,
  isValidIBAN,
} from "../utils/knowledge-base-loader";

// ============================================================================
// OUTPUT SCHEMA (shared by all validation tools)
// ============================================================================

const validationOutputSchema = z.object({
  isValid: z.boolean().describe("Whether the value passes format validation"),
  cleanedValue: z
    .string()
    .describe("The cleaned/normalized value (whitespace removed, uppercase)"),
  fieldType: z.string().describe("The type of field being validated"),
  originalValue: z.string().describe("The original input value"),
  validationMessage: z
    .string()
    .describe("Human-readable validation result message"),
});

export type ValidationOutput = z.infer<typeof validationOutputSchema>;

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Cleans and normalizes a value for validation
 */
function cleanValue(value: string): string {
  return value.replaceAll(/\s/g, "").toUpperCase();
}

// ============================================================================
// VALIDATION TOOLS
// ============================================================================

/**
 * Validates an extracted IBAN value
 *
 * Italian IBAN format: IT + 2 check digits + 23 alphanumeric characters = 27 total
 */
export const validateIbanTool = createTool({
  id: "validateIban",
  description: `Validates an extracted IBAN value against Italian IBAN format.
Italian IBAN must be 27 characters: IT + 2 check digits + 23 alphanumeric characters.
Use this tool after extracting a potential IBAN from the invoice XML.`,
  inputSchema: z.object({
    value: z.string().describe("The extracted IBAN value to validate"),
    xmlLocation: z
      .string()
      .optional()
      .describe("The XML path/location where this value was found"),
  }),
  outputSchema: validationOutputSchema,
  execute: ({ context }) => {
    const { value, xmlLocation } = context;
    const cleaned = cleanValue(value);
    const isValid = isValidIBAN(value);

    return {
      isValid,
      cleanedValue: cleaned,
      fieldType: "IBAN",
      originalValue: value,
      validationMessage: isValid
        ? `IBAN valido trovato${xmlLocation ? ` in ${xmlLocation}` : ""}: ${cleaned}`
        : `IBAN non valido (formato atteso: IT + 2 cifre + 23 caratteri alfanumerici): ${value}`,
    };
  },
});

/**
 * Validates an extracted CIG (Codice Identificativo Gara) value
 *
 * CIG format: 10 alphanumeric characters
 */
export const validateCigTool = createTool({
  id: "validateCig",
  description: `Validates an extracted CIG (Codice Identificativo Gara) value.
CIG must be exactly 10 alphanumeric characters.
Use this tool after extracting a potential CIG from the invoice XML.`,
  inputSchema: z.object({
    value: z.string().describe("The extracted CIG value to validate"),
    xmlLocation: z
      .string()
      .optional()
      .describe("The XML path/location where this value was found"),
  }),
  outputSchema: validationOutputSchema,
  execute: ({ context }) => {
    const { value, xmlLocation } = context;
    const cleaned = cleanValue(value);
    const isValid = isValidCIG(value);

    return {
      isValid,
      cleanedValue: cleaned,
      fieldType: "CIG",
      originalValue: value,
      validationMessage: isValid
        ? `CIG valido trovato${xmlLocation ? ` in ${xmlLocation}` : ""}: ${cleaned}`
        : `CIG non valido (formato atteso: 10 caratteri alfanumerici): ${value}`,
    };
  },
});

/**
 * Validates an extracted CUP (Codice Unico di Progetto) value
 *
 * CUP format: 15 alphanumeric characters
 */
export const validateCupTool = createTool({
  id: "validateCup",
  description: `Validates an extracted CUP (Codice Unico di Progetto) value.
CUP must be exactly 15 alphanumeric characters.
Use this tool after extracting a potential CUP from the invoice XML.`,
  inputSchema: z.object({
    value: z.string().describe("The extracted CUP value to validate"),
    xmlLocation: z
      .string()
      .optional()
      .describe("The XML path/location where this value was found"),
  }),
  outputSchema: validationOutputSchema,
  execute: ({ context }) => {
    const { value, xmlLocation } = context;
    const cleaned = cleanValue(value);
    const isValid = isValidCUP(value);

    return {
      isValid,
      cleanedValue: cleaned,
      fieldType: "CUP",
      originalValue: value,
      validationMessage: isValid
        ? `CUP valido trovato${xmlLocation ? ` in ${xmlLocation}` : ""}: ${cleaned}`
        : `CUP non valido (formato atteso: 15 caratteri alfanumerici): ${value}`,
    };
  },
});

/**
 * Validates an extracted Codice Fiscale value
 *
 * Codice Fiscale formats:
 * - Companies: 11 numeric digits (same as P.IVA)
 * - Individuals: 16 alphanumeric characters (SSSSSS00A00A000A pattern)
 */
export const validateCodiceFiscaleTool = createTool({
  id: "validateCodiceFiscale",
  description: `Validates an extracted Codice Fiscale value.
Codice Fiscale can be:
- For companies: 11 numeric digits (same as P.IVA)
- For individuals: 16 alphanumeric characters (SSSSSS00A00A000A pattern)
Use this tool after extracting a potential Codice Fiscale from the invoice XML.`,
  inputSchema: z.object({
    value: z
      .string()
      .describe("The extracted Codice Fiscale value to validate"),
    xmlLocation: z
      .string()
      .optional()
      .describe("The XML path/location where this value was found"),
  }),
  outputSchema: validationOutputSchema,
  execute: ({ context }) => {
    const { value, xmlLocation } = context;
    const cleaned = cleanValue(value);
    const isValid = isValidCodiceFiscale(value);

    return {
      isValid,
      cleanedValue: cleaned,
      fieldType: "Codice Fiscale",
      originalValue: value,
      validationMessage: isValid
        ? `Codice Fiscale valido trovato${xmlLocation ? ` in ${xmlLocation}` : ""}: ${cleaned}`
        : `Codice Fiscale non valido (formato atteso: 11 cifre per aziende o 16 caratteri per persone fisiche): ${value}`,
    };
  },
});

/**
 * Validates an extracted Codice Destinatario PA value
 *
 * PA Code format: 6 or 7 alphanumeric characters
 */
export const validateCodicePaTool = createTool({
  id: "validateCodicePa",
  description: `Validates an extracted Codice Destinatario PA (Public Administration code) value.
PA Code must be 6 or 7 alphanumeric characters.
Use this tool after extracting a potential PA code from the invoice XML.`,
  inputSchema: z.object({
    value: z.string().describe("The extracted PA code value to validate"),
    xmlLocation: z
      .string()
      .optional()
      .describe("The XML path/location where this value was found"),
  }),
  outputSchema: validationOutputSchema,
  execute: ({ context }) => {
    const { value, xmlLocation } = context;
    const cleaned = cleanValue(value);
    const isValid = isValidCodiceDestinatario(value);

    return {
      isValid,
      cleanedValue: cleaned,
      fieldType: "Codice PA",
      originalValue: value,
      validationMessage: isValid
        ? `Codice PA valido trovato${xmlLocation ? ` in ${xmlLocation}` : ""}: ${cleaned}`
        : `Codice PA non valido (formato atteso: 6-7 caratteri alfanumerici): ${value}`,
    };
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All invoice validation tools bundled for agent configuration
 */
export const invoiceValidationTools = {
  validateIban: validateIbanTool,
  validateCig: validateCigTool,
  validateCup: validateCupTool,
  validateCodiceFiscale: validateCodiceFiscaleTool,
  validateCodicePa: validateCodicePaTool,
};

/**
 * Type for the validation tools map
 */
export type InvoiceValidationTools = typeof invoiceValidationTools;
