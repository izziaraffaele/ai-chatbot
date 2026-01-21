/**
 * Knowledge Base Loader Utility
 *
 * Provides functions for listing and loading invoice files from the Faenza knowledge base.
 * Supports both local XML files and remote Oracle database as data sources.
 * Includes validation for required invoice fields (IBAN, CIG, CUP, etc.)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { ImpegnoForUI } from "@/lib/db/oracle-types";
import { readSibacFile } from "@/lib/smb/sibac-share";

/**
 * Directory containing the Faenza knowledge base files
 */
const KNOWLEDGE_BASE_PATH = join(process.cwd(), "mastra/knowledgebase/faenza");

/**
 * Directory containing files from SIBAC 01 - Cartella Condivisa (Windows shared folder)
 * Files can be synced from the Windows machine via RDP or mounted SMB share
 */
const SIBAC_SHARED_PATH = join(
  process.cwd(),
  "mastra/knowledgebase/sibac-shared"
);

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

/** File extension pattern for supported document types */
const FILE_EXTENSION_REGEX = /\.(xml|pdf|docx?)$/i;

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

// ============================================================================
// DATA SOURCE CONFIGURATION
// ============================================================================

/**
 * Available data sources for invoice/impegni data
 */
export type DataSource = "local" | "oracle" | "sibac-shared";

/**
 * Get the configured data source
 */
export function getDataSource(): DataSource {
  const source = process.env.INVOICE_DATA_SOURCE?.toLowerCase();
  if (source === "oracle") {
    return "oracle";
  }
  return "local";
}

/**
 * Check if Oracle data source is configured
 */
export function isOracleDataSource(): boolean {
  return getDataSource() === "oracle";
}

// ============================================================================
// UNIFIED DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * File info with validation status (for UI listing)
 */
export type FileWithValidation = {
  fileId: string;
  displayName?: string;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
  /** Data source this file belongs to */
  source?: DataSource;
};

// ============================================================================
// FILE SYSTEM TYPES (for hierarchical UI)
// ============================================================================

/**
 * Base type for file system items
 */
export type FileSystemItemBase = {
  id: string;
  name: string;
  type: "file" | "folder";
};

/**
 * A file in the file system
 */
export type FileSystemFile = FileSystemItemBase & {
  type: "file";
  fileId: string;
  displayName?: string;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
  source: DataSource;
};

/**
 * A folder in the file system
 */
/**
 * Error status for folders that may have connectivity issues
 */
export type FolderErrorStatus =
  | "ok"
  | "vpn_disconnected"
  | "server_unreachable"
  | "port_blocked"
  | "smb_error"
  | "sync_pending"
  | "unknown_error";

export type FileSystemFolder = FileSystemItemBase & {
  type: "folder";
  children: FileSystemItem[];
  /** Total count of files in this folder (including subfolders) */
  fileCount: number;
  /** Count of valid files */
  validCount: number;
  /** Count of invalid files */
  invalidCount: number;
  /** Whether this folder is expanded by default */
  defaultExpanded?: boolean;
  /** Icon for the folder */
  icon?: string;
  /** Description for the folder */
  description?: string;
  /** Error status for connectivity issues */
  errorStatus?: FolderErrorStatus;
  /** Detailed error message */
  errorMessage?: string;
  /**
   * If true, children should be loaded on-demand via API
   * The `lazyPath` indicates the path to use for fetching children
   */
  lazy?: boolean;
  /** Path to use for lazy loading children (relative to SMB share root) */
  lazyPath?: string;
};

/**
 * Union type for file system items
 */
export type FileSystemItem = FileSystemFile | FileSystemFolder;

/**
 * Root structure for the file system UI
 */
export type FileSystemRoot = {
  items: FileSystemItem[];
  totalFiles: number;
  totalValid: number;
  totalInvalid: number;
};

/**
 * Loaded record (unified format for both local and Oracle sources)
 */
export type LoadedRecord = {
  /** Canonical record identifier for re-loading (e.g., "sibac-shared:Faenza/.../file.xml") */
  recordId: string;
  metadata: InvoiceMetadata;
  content: string;
  validation: InvoiceValidation;
  source: DataSource;
  /** For Oracle records, the original impegno data */
  impegno?: ImpegnoForUI;
};

/**
 * List all available records with validation status
 *
 * This is the main function for getting the list of invoices/impegni.
 * It automatically uses the configured data source.
 *
 * @returns Promise with array of files with validation status
 */
export async function listRecordsWithValidation(): Promise<
  FileWithValidation[]
> {
  const source = getDataSource();

  if (source === "oracle") {
    // Dynamically import Oracle functions to avoid loading them when not needed
    const { listImpegni, validateImpegno } = await import(
      "@/lib/db/oracle-sibac"
    );

    try {
      const impegni = await listImpegni({ limit: 100 });
      return impegni.map((impegno) => {
        const validation = validateImpegno(impegno);
        return {
          fileId: impegno.fileId,
          displayName: impegno.displayName,
          fatturaValida: validation.fatturaValida,
          campiMancanti: validation.campiMancanti,
          campiNonValidi: validation.campiNonValidi,
        };
      });
    } catch (error) {
      console.error("[KB] Error listing Oracle records:", error);
      throw error;
    }
  }

  // Local XML files
  const files = listKnowledgeBaseFiles();
  return files.map((fileId) => {
    const invoice = loadKnowledgeBaseFile(fileId);
    if (invoice) {
      const validation = validateInvoice(invoice.content);
      return {
        fileId,
        displayName: invoice.metadata.supplier,
        fatturaValida: validation.fatturaValida,
        campiMancanti: validation.campiMancanti.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
        campiNonValidi: validation.campiNonValidi.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
      };
    }
    return {
      fileId,
      fatturaValida: false,
      campiMancanti: ["Impossibile caricare il file"],
      campiNonValidi: [],
    };
  });
}

/**
 * Load a specific record by ID
 *
 * This is the main function for loading a single invoice/impegno.
 * Automatically detects the source from the recordId prefix or uses configured data source.
 *
 * @param recordId - The record identifier (file ID or CIG code), may include source prefix
 * @returns Promise with loaded record or null if not found
 */
export async function loadRecord(
  recordId: string
): Promise<LoadedRecord | null> {
  // Check if recordId has a sibac-shared source prefix
  if (recordId.startsWith("sibac-shared:")) {
    const fileId = recordId.replace("sibac-shared:", "");

    // First try to load from local filesystem
    let invoice = loadSibacSharedFile(fileId);

    // If not found locally and it's a path (contains /), try fetching from SMB share
    if (!invoice && fileId.includes("/")) {
      console.log(`[KB] File not found locally, fetching from SMB: ${fileId}`);
      invoice = await fetchFromSmbShare(fileId);
    }

    if (!invoice) {
      return null;
    }

    // For XML files, validate them
    const isXml = invoice.metadata.fileName.endsWith(".xml");
    const validation = isXml
      ? validateInvoice(invoice.content)
      : {
          iban: null,
          cig: null,
          cup: null,
          codiceFornitore: null,
          importoSpesa: null,
          descrizioneSpesa: null,
          codicePA: null,
          codiceFiscale: null,
          fatturaValida: false,
          campiMancanti: ["Formato non supportato"],
          campiNonValidi: [],
        };

    return {
      recordId, // Preserve the canonical ID for re-loading
      metadata: invoice.metadata,
      content: invoice.content,
      validation: {
        ...validation,
        campiMancanti: validation.campiMancanti.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
        campiNonValidi: validation.campiNonValidi.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
      },
      source: "sibac-shared",
    };
  }

  const source = getDataSource();

  if (source === "oracle") {
    const { getImpegnoById, validateImpegno, impegnoToMetadata } = await import(
      "@/lib/db/oracle-sibac"
    );

    try {
      const impegno = await getImpegnoById(recordId);
      if (!impegno) {
        return null;
      }

      const validation = validateImpegno(impegno);
      const metadata = impegnoToMetadata(impegno);

      // Create a simple text representation for content
      const content = JSON.stringify(impegno.rawRecord, null, 2);

      return {
        recordId: `oracle:${impegno.fileId}`, // Canonical ID for Oracle records
        metadata,
        content,
        validation,
        source: "oracle",
        impegno,
      };
    } catch (error) {
      console.error("[KB] Error loading Oracle record:", error);
      throw error;
    }
  }

  // Local XML files
  const invoice = loadKnowledgeBaseFile(recordId);
  if (!invoice) {
    return null;
  }

  const validation = validateInvoice(invoice.content);

  return {
    recordId: invoice.metadata.fileId, // Use the resolved fileId for local files
    metadata: invoice.metadata,
    content: invoice.content,
    validation: {
      ...validation,
      campiMancanti: validation.campiMancanti.map(
        (field) => VALIDATION_FIELD_NAMES[field] ?? field
      ),
      campiNonValidi: validation.campiNonValidi.map(
        (field) => VALIDATION_FIELD_NAMES[field] ?? field
      ),
    },
    source: "local",
  };
}

/**
 * Find suggestions for a record ID
 *
 * @param searchTerm - The search term
 * @returns Promise with array of matching file IDs
 */
export async function findRecordSuggestions(
  searchTerm: string
): Promise<string[]> {
  const source = getDataSource();

  if (source === "oracle") {
    // For Oracle, search by CIG or beneficiary
    const { listImpegni } = await import("@/lib/db/oracle-sibac");

    try {
      const results = await listImpegni({
        beneficiario: searchTerm,
        limit: 5,
      });
      return results.map((r) => r.fileId);
    } catch {
      return [];
    }
  }

  // Local: filter files by search term
  const files = listKnowledgeBaseFiles();
  const term = searchTerm.toUpperCase();
  return files.filter((f) => f.toUpperCase().includes(term)).slice(0, 5);
}

// ============================================================================
// SIBAC SHARED FOLDER FUNCTIONS
// ============================================================================

/**
 * Lists all files in the SIBAC shared folder
 * These files come from "SIBAC 01 - Cartella Condivisa" on the Windows server
 * accessed via RDP at 192.168.0.204
 *
 * @returns Array of file identifiers (without extension)
 */
export function listSibacSharedFiles(): string[] {
  try {
    const files = readdirSync(SIBAC_SHARED_PATH);
    return files
      .filter(
        (f) =>
          f.endsWith(".xml") ||
          f.endsWith(".pdf") ||
          f.endsWith(".doc") ||
          f.endsWith(".docx")
      )
      .map((f) => f.replace(FILE_EXTENSION_REGEX, ""));
  } catch {
    // Folder might not exist yet
    console.log("[KB] SIBAC shared folder not found or empty");
    return [];
  }
}

/**
 * Fetches a file from the SMB share directly
 *
 * @param filePath - Full path to the file within the SMB share
 * @returns Loaded invoice with metadata and content, or null if fetch failed
 */
async function fetchFromSmbShare(
  filePath: string
): Promise<LoadedInvoice | null> {
  // Security: block obvious path traversal attempts
  if (filePath.startsWith("..") || filePath.includes("/../")) {
    console.error(
      `[KB] Path traversal attempt blocked in SMB fetch: ${filePath}`
    );
    return null;
  }

  try {
    console.log(`[KB] Fetching from SMB: ${filePath}`);
    const result = await readSibacFile(filePath);

    if (!result.success || !result.content) {
      console.error(`[KB] SMB fetch failed: ${result.error ?? "No content"}`);
      return null;
    }

    const fileName = filePath.split("/").pop() ?? filePath;
    const content = result.content;

    // For XML files, extract metadata
    if (fileName.endsWith(".xml")) {
      const metadata = extractMetadataFromContent(content, fileName);
      return { metadata, content };
    }

    // For other file types, return basic metadata
    return {
      metadata: {
        fileId: fileName.replace(FILE_EXTENSION_REGEX, ""),
        fileName,
      },
      content,
    };
  } catch (error) {
    console.error(`[KB] Error fetching from SMB share: ${filePath}`, error);
    return null;
  }
}

/**
 * Loads a file from the SIBAC shared folder
 *
 * @param fileId - File identifier (can be a full path like "Unione/repositoryFE/.../file.xml")
 * @returns Loaded invoice with metadata and content, or null if not found
 */
export function loadSibacSharedFile(fileId: string): LoadedInvoice | null {
  try {
    // Check if fileId is a full path (contains /)
    if (fileId.includes("/")) {
      // Direct path - construct full file path
      const filePath = resolve(SIBAC_SHARED_PATH, fileId);

      // Security: prevent path traversal attacks (e.g., ../../../etc/passwd)
      if (
        !filePath.startsWith(SIBAC_SHARED_PATH + sep) &&
        filePath !== SIBAC_SHARED_PATH
      ) {
        console.error(`[KB] Path traversal attempt blocked: ${fileId}`);
        return null;
      }

      // Check if file exists
      if (!existsSync(filePath)) {
        console.log(`[KB] File not found at path: ${filePath}`);
        return null;
      }

      const content = readFileSync(filePath, "utf-8");
      const fileName = fileId.split("/").pop() ?? fileId;

      // For XML files, extract metadata
      if (fileName.endsWith(".xml")) {
        const metadata = extractMetadataFromContent(content, fileName);
        return { metadata, content };
      }

      // For other file types, return basic metadata
      return {
        metadata: {
          fileId: fileName.replace(FILE_EXTENSION_REGEX, ""),
          fileName,
        },
        content,
      };
    }

    // Legacy behavior: search in root directory
    const files = readdirSync(SIBAC_SHARED_PATH);

    // Find matching file (try different extensions)
    const matchedFile = files.find(
      (f) =>
        f.startsWith(fileId) || f.toLowerCase().includes(fileId.toLowerCase())
    );

    if (!matchedFile) {
      console.log(`[KB] No matching file found in SIBAC shared: ${fileId}`);
      return null;
    }

    const filePath = join(SIBAC_SHARED_PATH, matchedFile);
    const content = readFileSync(filePath, "utf-8");

    // For XML files, extract metadata
    if (matchedFile.endsWith(".xml")) {
      const metadata = extractMetadataFromContent(content, matchedFile);
      return { metadata, content };
    }

    // For other file types, return basic metadata
    return {
      metadata: {
        fileId: matchedFile.replace(FILE_EXTENSION_REGEX, ""),
        fileName: matchedFile,
      },
      content,
    };
  } catch (error) {
    console.error(`[KB] Error loading SIBAC shared file ${fileId}:`, error);
    return null;
  }
}

/**
 * Extract metadata from XML content
 * Exported for use by the SIBAC indexer
 */
export function extractMetadataFromContent(
  content: string,
  fileName: string
): InvoiceMetadata {
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

// ============================================================================
// HIERARCHICAL FILE SYSTEM FUNCTIONS
// ============================================================================

/**
 * Get local files as FileSystemFile items
 */
function getLocalFilesAsFileSystem(): FileSystemFile[] {
  const files = listKnowledgeBaseFiles();
  return files.map((fileId) => {
    const invoice = loadKnowledgeBaseFile(fileId);
    if (invoice) {
      const validation = validateInvoice(invoice.content);
      return {
        id: `local:${fileId}`,
        name: invoice.metadata.supplier ?? fileId.split("_")[0] ?? fileId,
        type: "file" as const,
        fileId,
        displayName: invoice.metadata.supplier,
        fatturaValida: validation.fatturaValida,
        campiMancanti: validation.campiMancanti.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
        campiNonValidi: validation.campiNonValidi.map(
          (field) => VALIDATION_FIELD_NAMES[field] ?? field
        ),
        source: "local" as const,
      };
    }
    return {
      id: `local:${fileId}`,
      name: fileId.split("_")[0] ?? fileId,
      type: "file" as const,
      fileId,
      displayName: undefined,
      fatturaValida: false,
      campiMancanti: ["Impossibile caricare il file"],
      campiNonValidi: [],
      source: "local" as const,
    };
  });
}

/**
 * Get Oracle files as FileSystemFile items
 */
async function getOracleFilesAsFileSystem(): Promise<FileSystemFile[]> {
  try {
    const { listImpegni, validateImpegno } = await import(
      "@/lib/db/oracle-sibac"
    );

    const impegni = await listImpegni({ limit: 100 });
    return impegni.map((impegno) => {
      const validation = validateImpegno(impegno);
      return {
        id: `oracle:${impegno.fileId}`,
        name: impegno.displayName ?? impegno.beneficiario ?? impegno.fileId,
        type: "file" as const,
        fileId: impegno.fileId,
        displayName: impegno.displayName,
        fatturaValida: validation.fatturaValida,
        campiMancanti: validation.campiMancanti,
        campiNonValidi: validation.campiNonValidi,
        source: "oracle" as const,
      };
    });
  } catch (error) {
    console.error("[KB] Error fetching Oracle files:", error);
    return [];
  }
}

/**
 * Calculate folder statistics from children
 */
function calculateFolderStats(children: FileSystemItem[]): {
  fileCount: number;
  validCount: number;
  invalidCount: number;
} {
  let fileCount = 0;
  let validCount = 0;
  let invalidCount = 0;

  for (const child of children) {
    if (child.type === "file") {
      fileCount++;
      if (child.fatturaValida) {
        validCount++;
      } else {
        invalidCount++;
      }
    } else if (child.type === "folder") {
      fileCount += child.fileCount;
      validCount += child.validCount;
      invalidCount += child.invalidCount;
    }
  }

  return { fileCount, validCount, invalidCount };
}

/**
 * Get hierarchical file system structure with local, Oracle, and shared folder data
 *
 * Returns three main folders:
 * - "SIBAC 01 - Cartella Condivisa" - Files from Windows shared folder (lazy loaded)
 * - "Database SIBAC" - Files from Oracle database (when VPN connected)
 * - "Fatture Locali (Debug)" - Local XML files for debugging
 */
export async function getFileSystemHierarchy(): Promise<FileSystemRoot> {
  // Import VPN diagnostics
  const { diagnoseOracleConnection } = await import("@/lib/vpn/faenza-vpn");

  // SIBAC shared folder uses lazy loading - children are fetched on-demand via API
  // This avoids slow initial page loads when the share has many files
  const sibacSharedFolder: FileSystemFolder = {
    id: "folder:sibac-shared",
    name: "SIBAC 01 - Cartella Condivisa",
    type: "folder",
    children: [], // Will be populated lazily
    fileCount: 0, // Unknown until loaded
    validCount: 0,
    invalidCount: 0,
    defaultExpanded: false,
    icon: "folder-sync",
    description: "Cartella condivisa Akropolis - FE (clicca per esplorare)",
    errorStatus: "ok",
    lazy: true, // Enable lazy loading
    lazyPath: "", // Root of the share
  };

  // Get local files
  const localFiles = getLocalFilesAsFileSystem();
  const localStats = calculateFolderStats(localFiles);

  const localFolder: FileSystemFolder = {
    id: "folder:local",
    name: "Fatture Locali (Debug)",
    type: "folder",
    children: localFiles,
    fileCount: localStats.fileCount,
    validCount: localStats.validCount,
    invalidCount: localStats.invalidCount,
    defaultExpanded: false,
    icon: "hard-drive",
    description: "File XML locali per debugging",
    errorStatus: "ok",
  };

  // Try to get Oracle files with detailed diagnostics
  let oracleFolder: FileSystemFolder;

  try {
    // First run diagnostics to get detailed status
    const diagnosis = await diagnoseOracleConnection();

    if (diagnosis.status !== "ok") {
      // Connection issue detected - create empty folder with specific error
      oracleFolder = {
        id: "folder:oracle",
        name: "Database SIBAC",
        type: "folder",
        children: [],
        fileCount: 0,
        validCount: 0,
        invalidCount: 0,
        defaultExpanded: false,
        icon: "database-off",
        description: "Impegni dal database Oracle SIBAC",
        errorStatus: diagnosis.status as FolderErrorStatus,
        errorMessage: diagnosis.message,
      };
    } else {
      // Connection OK - fetch data
      const oracleFiles = await getOracleFilesAsFileSystem();
      const oracleStats = calculateFolderStats(oracleFiles);

      oracleFolder = {
        id: "folder:oracle",
        name: "Database SIBAC",
        type: "folder",
        children: oracleFiles,
        fileCount: oracleStats.fileCount,
        validCount: oracleStats.validCount,
        invalidCount: oracleStats.invalidCount,
        defaultExpanded: oracleFiles.length > 0,
        icon: "database",
        description: "Impegni dal database Oracle SIBAC",
        errorStatus: "ok",
      };
    }
  } catch (error) {
    console.error("[KB] Oracle connection failed:", error);
    // Create empty folder with error indication
    oracleFolder = {
      id: "folder:oracle",
      name: "Database SIBAC",
      type: "folder",
      children: [],
      fileCount: 0,
      validCount: 0,
      invalidCount: 0,
      defaultExpanded: false,
      icon: "database-off",
      description: "Impegni dal database Oracle SIBAC",
      errorStatus: "unknown_error",
      errorMessage: `Errore di connessione: ${error}`,
    };
  }

  // Order: SIBAC Shared first (main), then Oracle, then local debug
  const items: FileSystemItem[] = [
    sibacSharedFolder,
    oracleFolder,
    localFolder,
  ];

  return {
    items,
    totalFiles:
      sibacSharedFolder.fileCount +
      oracleFolder.fileCount +
      localFolder.fileCount,
    totalValid:
      sibacSharedFolder.validCount +
      oracleFolder.validCount +
      localFolder.validCount,
    totalInvalid:
      sibacSharedFolder.invalidCount +
      oracleFolder.invalidCount +
      localFolder.invalidCount,
  };
}

/**
 * Flatten file system hierarchy to get all files
 * Useful for search across all folders
 */
export function flattenFileSystem(items: FileSystemItem[]): FileSystemFile[] {
  const files: FileSystemFile[] = [];

  for (const item of items) {
    if (item.type === "file") {
      files.push(item);
    } else if (item.type === "folder") {
      files.push(...flattenFileSystem(item.children));
    }
  }

  return files;
}
