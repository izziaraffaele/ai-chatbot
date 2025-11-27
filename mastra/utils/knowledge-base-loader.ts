/**
 * Knowledge Base Loader Utility
 *
 * Provides functions for listing and loading invoice files from the Faenza knowledge base.
 * Supports partial matching for flexible file lookups.
 * Includes validation for required invoice fields (IBAN, CIG, CUP, etc.)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Directory containing the Faenza knowledge base files
 */
const KNOWLEDGE_BASE_PATH = join(process.cwd(), "mastra/knowledgebase/faenza");

// ============================================================================
// REGEX PATTERNS (top-level for performance)
// ============================================================================

/** Whitespace pattern for cleaning input strings */
const WHITESPACE_REGEX = /\s/g;

/** Italian IBAN format: IT + 2 check digits + 23 alphanumeric characters */
const IBAN_REGEX = /^IT\d{2}[A-Z0-9]{23}$/;

/** CIG format: 10 alphanumeric characters */
const CIG_REGEX = /^[A-Z0-9]{10}$/;

/** CUP format: 15 alphanumeric characters */
const CUP_REGEX = /^[A-Z0-9]{15}$/;

/** Codice Fiscale company format: 11 digits */
const CF_COMPANY_REGEX = /^\d{11}$/;

/** Codice Fiscale individual format: SSSSSS00A00A000A */
const CF_INDIVIDUAL_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;

/** Codice Destinatario (PA Code) format: 6-7 alphanumeric characters */
const CODICE_DESTINATARIO_REGEX = /^[A-Z0-9]{6,7}$/;

/** XML CedentePrestatore block extraction */
const CEDENTE_PRESTATORE_REGEX =
  /<CedentePrestatore>([\s\S]*?)<\/CedentePrestatore>/i;

/** XML CessionarioCommittente block extraction */
const CESSIONARIO_COMMITTENTE_REGEX =
  /<CessionarioCommittente>([\s\S]*?)<\/CessionarioCommittente>/i;

/** XML Denominazione tag extraction */
const DENOMINAZIONE_REGEX = /<Denominazione>([^<]+)<\/Denominazione>/i;

/** XML IdCodice tag extraction */
const ID_CODICE_REGEX = /<IdCodice>([^<]+)<\/IdCodice>/i;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates Italian IBAN format
 * Italian IBAN: IT + 2 check digits + 23 alphanumeric characters = 27 total
 */
export function isValidIBAN(iban: string): boolean {
  if (!iban) {
    return false;
  }
  const cleaned = iban.replaceAll(WHITESPACE_REGEX, "").toUpperCase();
  return IBAN_REGEX.test(cleaned);
}

/**
 * Validates CIG (Codice Identificativo Gara) format
 * CIG: 10 alphanumeric characters
 */
export function isValidCIG(cig: string): boolean {
  if (!cig) {
    return false;
  }
  const cleaned = cig.replaceAll(WHITESPACE_REGEX, "").toUpperCase();
  return CIG_REGEX.test(cleaned);
}

/**
 * Validates CUP (Codice Unico di Progetto) format
 * CUP: 15 alphanumeric characters
 */
export function isValidCUP(cup: string): boolean {
  if (!cup) {
    return false;
  }
  const cleaned = cup.replaceAll(WHITESPACE_REGEX, "").toUpperCase();
  return CUP_REGEX.test(cleaned);
}

/**
 * Validates Italian Codice Fiscale format
 * - For individuals: 16 alphanumeric characters (SSSSSS00A00A000A pattern)
 * - For companies: 11 numeric digits (same as P.IVA)
 */
export function isValidCodiceFiscale(cf: string): boolean {
  if (!cf) {
    return false;
  }
  const cleaned = cf.replaceAll(WHITESPACE_REGEX, "").toUpperCase();
  // Company format: 11 digits
  if (CF_COMPANY_REGEX.test(cleaned)) {
    return true;
  }
  // Individual format: 16 chars (SSSSSS00A00A000A)
  if (CF_INDIVIDUAL_REGEX.test(cleaned)) {
    return true;
  }
  return false;
}

/**
 * Validates Codice Destinatario (PA Code) format
 * PA Code: 6 or 7 alphanumeric characters
 */
export function isValidCodiceDestinatario(code: string): boolean {
  if (!code) {
    return false;
  }
  const cleaned = code.replaceAll(WHITESPACE_REGEX, "").toUpperCase();
  return CODICE_DESTINATARIO_REGEX.test(cleaned);
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Human-readable names for validation fields (Italian)
 */
export const VALIDATION_FIELD_NAMES: Record<string, string> = {
  iban: "IBAN",
  cig: "CIG (Codice Identificativo Gara)",
  cup: "CUP (Codice Unico di Progetto)",
  codiceFornitore: "Codice Fornitore (P.IVA)",
  importoSpesa: "Importo Spesa",
  descrizioneSpesa: "Descrizione Spesa",
  codicePA: "Codice Destinatario PA",
  codiceFiscale: "Codice Fiscale Fornitore",
};

/**
 * Invoice validation result
 */
export type InvoiceValidation = {
  /** IBAN from DettaglioPagamento */
  iban: string | null;
  /** CIG from DatiOrdineAcquisto/DatiContratto */
  cig: string | null;
  /** CUP from DatiOrdineAcquisto/DatiContratto */
  cup: string | null;
  /** Supplier VAT ID (IdCodice from CedentePrestatore) */
  codiceFornitore: string | null;
  /** Total expense amount (ImportoTotaleDocumento) */
  importoSpesa: number | null;
  /** Expense description (Causale or first Descrizione) */
  descrizioneSpesa: string | null;
  /** PA destination code (CodiceDestinatario) */
  codicePA: string | null;
  /** Supplier tax code (CodiceFiscale from CedentePrestatore) */
  codiceFiscale: string | null;
  /** Whether the invoice passes all validation checks */
  fatturaValida: boolean;
  /** List of field names that are missing or have invalid format */
  campiMancanti: string[];
  /** List of field names that are present but have invalid format */
  campiNonValidi: string[];
};

/**
 * Metadata extracted from an invoice XML file
 */
export type InvoiceMetadata = {
  /** File identifier (without path) */
  fileId: string;
  /** Full file name */
  fileName: string;
  /** Supplier name (CedentePrestatore) */
  supplier?: string;
  /** Supplier VAT ID */
  supplierVatId?: string;
  /** Buyer name (CessionarioCommittente) */
  buyer?: string;
  /** Buyer VAT ID */
  buyerVatId?: string;
  /** Invoice date */
  date?: string;
  /** Invoice number */
  invoiceNumber?: string;
  /** Document type (TD01, TD24, etc.) */
  documentType?: string;
  /** Total amount */
  totalAmount?: number;
  /** Currency */
  currency?: string;
};

/**
 * Result of loading an invoice file
 */
export type LoadedInvoice = {
  /** Extracted metadata */
  metadata: InvoiceMetadata;
  /** Raw XML content */
  content: string;
};

/**
 * Lists all available invoice files in the knowledge base
 *
 * @returns Array of file identifiers (without extension)
 */
export function listKnowledgeBaseFiles(): string[] {
  try {
    const files = readdirSync(KNOWLEDGE_BASE_PATH);
    return files
      .filter((f) => f.endsWith(".xml"))
      .map((f) => f.replace(".xml", ""));
  } catch (error) {
    console.error("[KB] Error listing knowledge base files:", error);
    return [];
  }
}

/**
 * Finds a file by partial ID matching
 *
 * Supports matching by:
 * - Full file name (with or without extension)
 * - Partial file ID (e.g., "CSB_IT00185240397" matches "CSB_IT00185240397_00IS8-[1796150500].xml")
 * - Tax ID / VAT number (e.g., "00185240397")
 *
 * @param fileId - Partial or full file identifier
 * @returns Full file name if found, null otherwise
 */
export function findMatchingFile(fileId: string): string | null {
  const files = listKnowledgeBaseFiles();

  // Normalize the search term
  const searchTerm = fileId.trim().toUpperCase();

  // Try exact match first (without extension)
  const exactMatch = files.find(
    (f) =>
      f.toUpperCase() === searchTerm || f.toUpperCase() === `${searchTerm}.XML`
  );
  if (exactMatch) {
    return `${exactMatch}.xml`;
  }

  // Try partial match (file starts with search term or contains it)
  const partialMatch = files.find(
    (f) =>
      f.toUpperCase().startsWith(searchTerm) ||
      f.toUpperCase().includes(searchTerm)
  );
  if (partialMatch) {
    return `${partialMatch}.xml`;
  }

  return null;
}

/**
 * Extracts metadata from invoice XML content
 *
 * Parses the FatturaElettronica XML format to extract key invoice details.
 *
 * @param content - XML content string
 * @param fileName - File name for metadata
 * @returns Extracted metadata
 */
function extractMetadata(content: string, fileName: string): InvoiceMetadata {
  const metadata: InvoiceMetadata = {
    fileId: fileName.replace(".xml", ""),
    fileName,
  };

  // Helper to extract text between tags
  const extractTag = (tag: string): string | undefined => {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  };

  // Extract supplier (CedentePrestatore) info
  const cedenteMatch = content.match(CEDENTE_PRESTATORE_REGEX);
  if (cedenteMatch) {
    const cedenteBlock = cedenteMatch[1];
    const denomMatch = cedenteBlock.match(DENOMINAZIONE_REGEX);
    metadata.supplier = denomMatch ? denomMatch[1].trim() : undefined;

    const vatMatch = cedenteBlock.match(ID_CODICE_REGEX);
    metadata.supplierVatId = vatMatch ? vatMatch[1].trim() : undefined;
  }

  // Extract buyer (CessionarioCommittente) info
  const cessionarioMatch = content.match(CESSIONARIO_COMMITTENTE_REGEX);
  if (cessionarioMatch) {
    const cessionarioBlock = cessionarioMatch[1];
    const denomMatch = cessionarioBlock.match(DENOMINAZIONE_REGEX);
    metadata.buyer = denomMatch ? denomMatch[1].trim() : undefined;

    const vatMatch = cessionarioBlock.match(ID_CODICE_REGEX);
    metadata.buyerVatId = vatMatch ? vatMatch[1].trim() : undefined;
  }

  // Extract document details
  metadata.documentType = extractTag("TipoDocumento");
  metadata.date = extractTag("Data");
  metadata.invoiceNumber = extractTag("Numero");
  metadata.currency = extractTag("Divisa");

  // Extract total amount
  const totalStr = extractTag("ImportoTotaleDocumento");
  if (totalStr) {
    metadata.totalAmount = Number.parseFloat(totalStr);
  }

  return metadata;
}

/**
 * Loads an invoice file from the knowledge base
 *
 * @param fileId - Partial or full file identifier
 * @returns Loaded invoice with metadata and content, or null if not found
 */
export function loadKnowledgeBaseFile(fileId: string): LoadedInvoice | null {
  const matchedFile = findMatchingFile(fileId);

  if (!matchedFile) {
    console.log(`[KB] No matching file found for: ${fileId}`);
    return null;
  }

  try {
    const filePath = join(KNOWLEDGE_BASE_PATH, matchedFile);
    const content = readFileSync(filePath, "utf-8");
    const metadata = extractMetadata(content, matchedFile);

    console.log(`[KB] Loaded invoice: ${matchedFile}`);

    return {
      metadata,
      content,
    };
  } catch (error) {
    console.error(`[KB] Error loading file ${matchedFile}:`, error);
    return null;
  }
}

/**
 * Gets a summary of all available invoices in the knowledge base
 *
 * @returns Array of invoice summaries with basic metadata
 */
export function getKnowledgeBaseSummary(): InvoiceMetadata[] {
  const files = listKnowledgeBaseFiles();

  return files.map((fileId) => {
    const loaded = loadKnowledgeBaseFile(fileId);
    if (loaded) {
      return loaded.metadata;
    }
    return {
      fileId,
      fileName: `${fileId}.xml`,
    };
  });
}

// ============================================================================
// INVOICE VALIDATION
// ============================================================================

/**
 * Validates an invoice XML content and extracts required fields
 *
 * Checks for presence and format validity of:
 * - IBAN (in DettaglioPagamento)
 * - CIG (in DatiOrdineAcquisto, DatiContratto, DatiConvenzione, DatiRicezione)
 * - CUP (in same locations as CIG)
 * - Codice Fornitore (IdCodice in CedentePrestatore)
 * - Importo Spesa (ImportoTotaleDocumento)
 * - Descrizione Spesa (Causale or Descrizione)
 * - Codice PA (CodiceDestinatario)
 * - Codice Fiscale (CodiceFiscale in CedentePrestatore)
 *
 * @param content - XML content string
 * @returns Validation result with extracted fields and validity status
 */
export function validateInvoice(content: string): InvoiceValidation {
  const campiMancanti: string[] = [];
  const campiNonValidi: string[] = [];

  // Helper to extract text between tags
  const extractTag = (tag: string, block?: string): string | null => {
    const source = block || content;
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = source.match(regex);
    return match ? match[1].trim() : null;
  };

  // Extract CedentePrestatore block for supplier data
  const cedenteMatch = content.match(CEDENTE_PRESTATORE_REGEX);
  const cedenteBlock = cedenteMatch ? cedenteMatch[1] : "";

  // 1. IBAN - from DettaglioPagamento
  const iban = extractTag("IBAN");
  if (!iban) {
    campiMancanti.push("iban");
  } else if (!isValidIBAN(iban)) {
    campiNonValidi.push("iban");
  }

  // 2. CIG - from DatiOrdineAcquisto, DatiContratto, DatiConvenzione, DatiRicezione
  const cig = extractTag("CodiceCIG");
  if (!cig) {
    campiMancanti.push("cig");
  } else if (!isValidCIG(cig)) {
    campiNonValidi.push("cig");
  }

  // 3. CUP - from same locations as CIG
  const cup = extractTag("CodiceCUP");
  if (!cup) {
    campiMancanti.push("cup");
  } else if (!isValidCUP(cup)) {
    campiNonValidi.push("cup");
  }

  // 4. Codice Fornitore (Supplier VAT ID) - IdCodice in CedentePrestatore
  const codiceFornitore = extractTag("IdCodice", cedenteBlock);
  if (!codiceFornitore) {
    campiMancanti.push("codiceFornitore");
  }

  // 5. Importo Spesa - ImportoTotaleDocumento
  const importoStr = extractTag("ImportoTotaleDocumento");
  let importoSpesa: number | null = null;
  if (importoStr) {
    const parsed = Number.parseFloat(importoStr);
    if (Number.isNaN(parsed)) {
      campiNonValidi.push("importoSpesa");
    } else {
      importoSpesa = parsed;
    }
  } else {
    campiMancanti.push("importoSpesa");
  }

  // 6. Descrizione Spesa - Causale (preferred) or first Descrizione
  let descrizioneSpesa = extractTag("Causale");
  if (!descrizioneSpesa) {
    descrizioneSpesa = extractTag("Descrizione");
  }
  if (!descrizioneSpesa) {
    campiMancanti.push("descrizioneSpesa");
  }

  // 7. Codice PA - CodiceDestinatario
  const codicePA = extractTag("CodiceDestinatario");
  if (!codicePA) {
    campiMancanti.push("codicePA");
  } else if (!isValidCodiceDestinatario(codicePA)) {
    campiNonValidi.push("codicePA");
  }

  // 8. Codice Fiscale - CodiceFiscale in CedentePrestatore
  const codiceFiscale = extractTag("CodiceFiscale", cedenteBlock);
  if (!codiceFiscale) {
    campiMancanti.push("codiceFiscale");
  } else if (!isValidCodiceFiscale(codiceFiscale)) {
    campiNonValidi.push("codiceFiscale");
  }

  // Determine overall validity
  const fatturaValida =
    campiMancanti.length === 0 && campiNonValidi.length === 0;

  return {
    iban: iban && isValidIBAN(iban) ? iban : null,
    cig: cig && isValidCIG(cig) ? cig : null,
    cup: cup && isValidCUP(cup) ? cup : null,
    codiceFornitore: codiceFornitore || null,
    importoSpesa,
    descrizioneSpesa: descrizioneSpesa || null,
    codicePA: codicePA && isValidCodiceDestinatario(codicePA) ? codicePA : null,
    codiceFiscale:
      codiceFiscale && isValidCodiceFiscale(codiceFiscale)
        ? codiceFiscale
        : null,
    fatturaValida,
    campiMancanti,
    campiNonValidi,
  };
}

/**
 * Validates an invoice file by loading and validating its content
 *
 * @param fileId - File identifier
 * @returns Validation result or null if file not found
 */
export function validateInvoiceFile(fileId: string): InvoiceValidation | null {
  const invoice = loadKnowledgeBaseFile(fileId);
  if (!invoice) {
    return null;
  }
  return validateInvoice(invoice.content);
}
