/**
 * Knowledge Base Loader
 *
 * Utilities for loading and validating invoice files from the knowledge base.
 * Used by document tools to generate template-based documents from invoices.
 */

import fs from "node:fs";
import path from "node:path";
import { parseInvoice } from "@/lib/invoice-parser";

/**
 * Path to the invoices knowledge base directory
 */
const INVOICES_KB_DIR = path.join(
  process.cwd(),
  "mastra/knowledgebase/invoices"
);

/**
 * Regex patterns for invoice parsing (defined at top level for performance)
 */
const SUPPLIER_NAME_REGEX = /<Denominazione>([^<]+)<\/Denominazione>/;
const BUYER_NAME_REGEX =
  /<CessionarioCommittente>[\s\S]*?<Denominazione>([^<]+)<\/Denominazione>/;
const INVOICE_NUMBER_REGEX = /<Numero>([^<]+)<\/Numero>/;
const INVOICE_DATE_REGEX = /<Data>([^<]+)<\/Data>/;

/**
 * Metadata extracted from an invoice file
 */
export type InvoiceMetadata = {
  /** File identifier */
  fileId: string;
  /** Supplier/vendor name */
  supplier: string;
  /** Total invoice amount */
  totalAmount: string;
  /** Invoice date */
  date: string;
  /** Invoice number/ID */
  invoiceNumber: string;
  /** Buyer/recipient name */
  buyer: string;
  /** CIG code (if present) */
  codiceCIG?: string;
  /** CUP code (if present) */
  codiceCUP?: string;
  /** Payment due date */
  paymentDueDate?: string;
  /** IBAN for payment */
  iban?: string;
};

/**
 * Validation check result
 */
export type ValidationCheck = {
  /** Check name/description */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Optional message with details */
  message?: string;
};

/**
 * Validation results for an invoice
 */
export type InvoiceValidation = {
  /** Whether all required fields are present and valid */
  isValid: boolean;
  /** List of validation checks performed */
  checks: ValidationCheck[];
  /** Summary of validation issues (if any) */
  summary?: string;
};

/**
 * Result of loading a knowledge base file
 */
export type KnowledgeBaseFile = {
  /** Extracted metadata */
  metadata: InvoiceMetadata;
  /** Raw file content (XML) */
  content: string;
};

/**
 * Load an invoice file from the knowledge base by file ID
 *
 * @param fileId - The file ID (filename without extension, or full path relative to KB dir)
 * @returns The loaded file with metadata, or null if not found
 */
export function loadKnowledgeBaseFile(
  fileId: string
): KnowledgeBaseFile | null {
  // Try to find the file
  const possiblePaths = [
    path.join(INVOICES_KB_DIR, fileId),
    path.join(INVOICES_KB_DIR, `${fileId}.xml`),
    path.join(process.cwd(), fileId),
  ];

  let filePath: string | null = null;
  let content: string | null = null;

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        content = fs.readFileSync(p, "utf8");
        filePath = p;
        break;
      }
    } catch {
      // Continue to next path
    }
  }

  if (!filePath || !content) {
    console.error(`[KnowledgeBase] File not found: ${fileId}`);
    return null;
  }

  // Parse the invoice to extract metadata
  const parsed = parseInvoice(content);

  // Extract supplier name from CedentePrestatore
  const supplierMatch = content.match(SUPPLIER_NAME_REGEX);
  const supplier = supplierMatch?.[1] ?? "Fornitore sconosciuto";

  // Extract buyer name
  const buyerBlock = content.match(BUYER_NAME_REGEX);
  const buyer = buyerBlock?.[1] ?? "Acquirente sconosciuto";

  // Extract invoice number and date from DatiGeneraliDocumento
  const invoiceNumber = content.match(INVOICE_NUMBER_REGEX)?.[1] ?? "";
  const invoiceDate = content.match(INVOICE_DATE_REGEX)?.[1] ?? "";

  // Calculate total amount from payment or line items
  const totalAmount =
    parsed.pagamento.importo ||
    parsed.lineItems
      .reduce(
        (sum, item) => sum + Number.parseFloat(item.prezzoTotale || "0"),
        0
      )
      .toFixed(2);

  const metadata: InvoiceMetadata = {
    fileId: path.basename(filePath),
    supplier,
    totalAmount,
    date: invoiceDate,
    invoiceNumber,
    buyer,
    codiceCIG: parsed.ordineData.codiceCIG || undefined,
    codiceCUP: parsed.ordineData.codiceCUP || undefined,
    paymentDueDate: parsed.pagamento.dataScadenza || undefined,
    iban: parsed.pagamento.iban || undefined,
  };

  console.log(
    `[KnowledgeBase] Loaded invoice: ${metadata.supplier}, amount=${metadata.totalAmount}`
  );

  return { metadata, content };
}

/**
 * Validate an invoice's content for completeness and correctness
 *
 * @param content - The raw XML content of the invoice
 * @returns Validation results with checks and summary
 */
export function validateInvoice(content: string): InvoiceValidation {
  const checks: ValidationCheck[] = [];

  // Parse the invoice
  const parsed = parseInvoice(content);

  // Check 1: Supplier information
  const hasSupplier =
    content.includes("<CedentePrestatore>") &&
    content.includes("<Denominazione>");
  checks.push({
    name: "Dati fornitore",
    passed: hasSupplier,
    message: hasSupplier
      ? "Dati del fornitore presenti"
      : "Mancano i dati del fornitore",
  });

  // Check 2: Buyer information
  const hasBuyer =
    content.includes("<CessionarioCommittente>") &&
    content.includes("<Denominazione>");
  checks.push({
    name: "Dati acquirente",
    passed: hasBuyer,
    message: hasBuyer
      ? "Dati dell'acquirente presenti"
      : "Mancano i dati dell'acquirente",
  });

  // Check 3: Invoice number and date
  const hasInvoiceNumber = content.includes("<Numero>");
  const hasInvoiceDate = content.includes("<Data>");
  const missingFields: string[] = [];
  if (!hasInvoiceNumber) {
    missingFields.push("numero");
  }
  if (!hasInvoiceDate) {
    missingFields.push("data");
  }
  checks.push({
    name: "Numero e data fattura",
    passed: hasInvoiceNumber && hasInvoiceDate,
    message:
      hasInvoiceNumber && hasInvoiceDate
        ? "Numero e data fattura presenti"
        : `Mancano: ${missingFields.join(", ")}`,
  });

  // Check 4: Line items
  const hasLineItems = parsed.lineItems.length > 0;
  checks.push({
    name: "Dettaglio linee",
    passed: hasLineItems,
    message: hasLineItems
      ? `${parsed.lineItems.length} linee di dettaglio trovate`
      : "Nessuna linea di dettaglio trovata",
  });

  // Check 5: Payment information
  const hasPaymentInfo =
    parsed.pagamento.importo && parsed.pagamento.dataScadenza;
  checks.push({
    name: "Dati pagamento",
    passed: Boolean(hasPaymentInfo),
    message: hasPaymentInfo
      ? `Pagamento: €${parsed.pagamento.importo} entro ${parsed.pagamento.dataScadenza}`
      : "Dati di pagamento incompleti",
  });

  // Check 6: CIG/CUP codes (for public administration)
  const hasCIG = Boolean(parsed.ordineData.codiceCIG);
  const hasCUP = Boolean(parsed.ordineData.codiceCUP);
  checks.push({
    name: "Codici CIG/CUP",
    passed: hasCIG || hasCUP,
    message:
      hasCIG || hasCUP
        ? `CIG: ${parsed.ordineData.codiceCIG || "N/A"}, CUP: ${parsed.ordineData.codiceCUP || "N/A"}`
        : "Codici CIG/CUP non presenti (potrebbero essere richiesti per PA)",
  });

  // Check 7: IBAN for payment
  const hasIBAN = Boolean(parsed.pagamento.iban);
  checks.push({
    name: "IBAN",
    passed: hasIBAN,
    message: hasIBAN ? `IBAN: ${parsed.pagamento.iban}` : "IBAN non presente",
  });

  // Calculate overall validity
  const criticalChecks = checks.slice(0, 4); // First 4 are critical
  const isValid = criticalChecks.every((c) => c.passed);

  // Generate summary
  const failedChecks = checks.filter((c) => !c.passed);
  const summary =
    failedChecks.length > 0
      ? `Verifiche fallite: ${failedChecks.map((c) => c.name).join(", ")}`
      : "Tutte le verifiche superate";

  return { isValid, checks, summary };
}

/**
 * List all invoice files in the knowledge base
 *
 * @returns Array of file IDs available in the knowledge base
 */
export function listKnowledgeBaseFiles(): string[] {
  try {
    if (!fs.existsSync(INVOICES_KB_DIR)) {
      console.log(`[KnowledgeBase] Directory not found: ${INVOICES_KB_DIR}`);
      return [];
    }

    const files = fs.readdirSync(INVOICES_KB_DIR);
    return files.filter((f) => f.endsWith(".xml") || f.endsWith(".XML"));
  } catch (err) {
    console.error("[KnowledgeBase] Error listing files:", err);
    return [];
  }
}
