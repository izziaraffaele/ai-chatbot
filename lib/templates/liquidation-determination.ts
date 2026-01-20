/**
 * Liquidation Determination Template (Documento di Liquidazione)
 *
 * Template for generating "Documento di Liquidazione" documents
 * based on invoice data. This is a standard Italian administrative document
 * used for official liquidation communications.
 *
 * This template uses Markdown format for clean text rendering and
 * easy editing. Tables use standard Markdown syntax.
 *
 * Template features:
 * - Uses Markdown format for clean, readable documents
 * - Triggers on "documento di liquidazione" or "determina di liquidazione"
 * - Uses "DA COMPILARE" as fallback for ALL missing fields
 * - Supports checkbox lists for delibere
 * - Tables use Markdown pipe syntax
 *
 * Fields derived from invoice:
 * - Supplier info (name, VAT, IBAN, CIG/CUP)
 * - Invoice details (number, date, amount)
 * - Buyer info (unit name)
 *
 * Fields using "DA COMPILARE" fallback:
 * - NUMERO_DETERMINA, ANNO_DETERMINA (administrative reference numbers)
 * - FIRMATARIO (signing officer)
 * - CAP/ART, IMPEGNO details
 * - DURC_PROTOCOLLO
 */

import {
  extractYear,
  formatDateItalian,
  templateRegistry,
} from "./index";
import type { DocumentTemplate, TemplateContext } from "./types";

/**
 * Default fallback value for missing fields
 */
const DA_COMPILARE = "DA COMPILARE";

/**
 * Format a number as Italian currency (without € symbol for use in text)
 * e.g., 1234.56 -> "1.234,56"
 */
function formatAmountItalian(amount?: number): string {
  if (amount === undefined || amount === null) {
    return DA_COMPILARE;
  }

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * The Documento di Liquidazione template content in Markdown format.
 * Uses {{variableName}} placeholders that will be replaced with invoice data.
 * This template matches the official Comune di Faenza liquidation document format.
 */
const LIQUIDATION_DETERMINATION_TEMPLATE = `# UNIONE della ROMAGNA FAENTINA

**{{UNITA_PADRE}}**

**{{UNITA_PROPONENTE}}**

---

## COMUNICAZIONE DI LIQUIDAZIONE n. {{NUMERO_DETERMINA}} / {{ANNO_DETERMINA}}

**OGGETTO: {{OGGETTO_DETERMINA}}**

---

AL SERVIZIO FINANZIARIO

**_Comunicazione di liquidazione della spesa complessiva di Euro {{IMPORTO_TOTALE_EURO}}_**

Richiamati i seguenti atti:

- [ ] Delibera di Consiglio dell'Unione n. 54 del 20/12/2024: "Approvazione Documento unico di programmazione 2025/2029, annualità 2025, presa d'atto del perimetro di consolidamento del Bilancio consolidato 2024, approvazione del Bilancio di previsione finanziario 2025/2027 e allegati obbligatori";

- [ ] Delibera di Giunta dell'Unione n. 1 del 09/01/2025: "Approvazione del Piano Esecutivo di Gestione (PEG) 2025/2027".

Viste le fatture/note inerenti la spesa in oggetto e riscontrata la regolarità della stessa agli effetti contabili e fiscali, l'avvenuta regolare fornitura e/o prestazione e attesa l'opportunità di procedere alla liquidazione nell'importo complessivo di € {{IMPORTO_TOTALE_EURO}}.

Tenuto conto della preventiva istruttoria svolta dal responsabile del servizio in ordine alla regolarità del presente provvedimento, come risultante dal visto sottoscritto con firma digitale che compone la presente comunicazione di liquidazione.

Visto che il Responsabile del procedimento e il Dirigente, rispettivamente con l'apposizione del visto di regolarità tecnica e con la sottoscrizione del presente atto, attestano l'assenza di qualsiasi interesse finanziario o economico o qualsiasi altro interesse personale diretto o indiretto con riferimento allo specifico oggetto del presente procedimento (assenza di conflitto di interessi ex art. 6-bis della Legge n. 241 del 07.08.1990).

Dato atto che le ditte risultano regolari con il versamento dei contributi, come attestato dai relativi DURC (prot. Inail/Inps n. {{DURC_PROTOCOLLO}}) conservati agli atti.

Si liquidano le fatture/note di seguito indicate e si richiede l'emissione dei corrispondenti mandati di pagamento.

### TABELLA FATTURE

| CAP/ART | Impegno N. | Impegno Anno | Impegno Atto | Creditore | IBAN | CIG/CUP | Oggetto | N/del | Importo | Scadenza |
|---------|------------|--------------|--------------|-----------|------|---------|---------|-------|---------|----------|
| {{CAP_ART}} | {{IMPEGNO_N}} | {{IMPEGNO_ANNO}} | {{IMPEGNO_ATTO}} | {{CREDITORE_DENOMINAZIONE}} - {{CREDITORE_SEDE}} | {{CREDITORE_IBAN}} | {{CREDITORE_CIG}} {{CREDITORE_CUP}} | {{FATTURA_OGGETTO}} | {{FATTURA_N_DEL}} | {{FATTURA_IMPORTO}} | {{FATTURA_SCADENZA}} |

---

*oppure*

Si liquidano i contributi di seguito indicati e si richiede l'emissione dei corrispondenti mandati di pagamento.

### TABELLA CONTRIBUTI/TRASFERIMENTI

| CAP/ART | Impegno N. | Impegno Anno | Impegno Atto | Creditore | IBAN | CIG/CUP | Oggetto | Importo | Ritenuta | Scadenza |
|---------|------------|--------------|--------------|-----------|------|---------|---------|---------|----------|----------|
| {{CONTRIBUTO_CAP_ART}} | {{CONTRIBUTO_IMPEGNO_N}} | {{CONTRIBUTO_IMPEGNO_ANNO}} | {{CONTRIBUTO_IMPEGNO_ATTO}} | {{CONTRIBUTO_CREDITORE_DENOMINAZIONE}} - {{CONTRIBUTO_CREDITORE_SEDE}} | {{CONTRIBUTO_CREDITORE_IBAN}} | {{CONTRIBUTO_CREDITORE_CIG}} {{CONTRIBUTO_CREDITORE_CUP}} | {{CONTRIBUTO_OGGETTO}} | {{CONTRIBUTO_IMPORTO}} | {{CONTRIBUTO_RITENUTA}} | {{CONTRIBUTO_SCADENZA}} |

---

Lì, {{DATA_DETERMINA}}

**IL DIRIGENTE**

{{FIRMATARIO}}

*(sottoscritto digitalmente ai sensi dell'art. 21 D.Lgs. n. 82/2005 e s.m.i.)*`;

/**
 * Maps invoice context data to template variables.
 * Uses "DA COMPILARE" as fallback for ALL missing fields.
 */
function mapInvoiceToLiquidationDetermination(
  context: TemplateContext
): Record<string, string> {
  const { metadata, validation, custom } = context;

  // Get current date for the document
  const currentDate = new Date();
  const formattedCurrentDate = formatDateItalian(currentDate.toISOString());
  const currentYear = currentDate.getFullYear().toString();

  // Extract year from invoice date or use current year
  const invoiceYear = extractYear(metadata.date) ?? currentYear;

  // Format the total amount (Italian format without € symbol)
  const importoTotale = formatAmountItalian(
    metadata.totalAmount ?? validation.importoSpesa ?? undefined
  );

  // Build supplier address from available data
  const creditoreAddress = metadata.supplierVatId
    ? `P.IVA: ${metadata.supplierVatId}`
    : DA_COMPILARE;

  // Build invoice N/del from number and date
  const fatturaNDel =
    metadata.invoiceNumber && metadata.date
      ? `${metadata.invoiceNumber} del ${formatDateItalian(metadata.date)}`
      : metadata.invoiceNumber
        ? metadata.invoiceNumber
        : DA_COMPILARE;

  // Build oggetto determina
  const oggettoDetermina =
    validation.descrizioneSpesa ||
    (metadata.supplier && metadata.invoiceNumber
      ? `Liquidazione fattura ${metadata.invoiceNumber} - ${metadata.supplier}`
      : DA_COMPILARE);

  // Get impegno data from custom context if available
  const impegno = custom?.impegno as
    | {
        capArt?: string;
        numero?: string;
        anno?: string;
        atto?: string;
      }
    | undefined;

  return {
    // Header information
    UNITA_PADRE:
      (custom?.unitaPadre as string) || "UNIONE DELLA ROMAGNA FAENTINA",
    UNITA_PROPONENTE: (custom?.unitaProponente as string) || DA_COMPILARE,

    // Administrative reference numbers
    NUMERO_DETERMINA: DA_COMPILARE,
    ANNO_DETERMINA: invoiceYear,

    // Object description
    OGGETTO_DETERMINA: oggettoDetermina,

    // Total amount (used in multiple places)
    IMPORTO_TOTALE_EURO: importoTotale,

    // DURC protocol
    DURC_PROTOCOLLO: DA_COMPILARE,

    // Table 1: Fatture - Budget/Impegno details
    CAP_ART: impegno?.capArt || DA_COMPILARE,
    IMPEGNO_N: impegno?.numero || DA_COMPILARE,
    IMPEGNO_ANNO: impegno?.anno || invoiceYear,
    IMPEGNO_ATTO: impegno?.atto || DA_COMPILARE,

    // Table 1: Fatture - Creditore (Supplier) information
    CREDITORE_DENOMINAZIONE: metadata.supplier || DA_COMPILARE,
    CREDITORE_SEDE: creditoreAddress,
    CREDITORE_IBAN: validation.iban || DA_COMPILARE,
    // CIG/CUP shown in a single cell, formatted appropriately
    CREDITORE_CIG: validation.cig ? `CIG: ${validation.cig}` : "",
    CREDITORE_CUP: validation.cup ? `CUP: ${validation.cup}` : "",

    // Table 1: Fatture - Invoice details
    FATTURA_OGGETTO: validation.descrizioneSpesa || DA_COMPILARE,
    FATTURA_N_DEL: fatturaNDel,
    FATTURA_IMPORTO: `€ ${importoTotale}`,
    FATTURA_SCADENZA: (custom?.dataScadenzaPagamento as string) || DA_COMPILARE,

    // Table 2: Contributi/Trasferimenti - all use DA COMPILARE fallback
    // (This table is included for completeness but populated with fallbacks for invoice-only generation)
    CONTRIBUTO_CAP_ART: "",
    CONTRIBUTO_IMPEGNO_N: "",
    CONTRIBUTO_IMPEGNO_ANNO: "",
    CONTRIBUTO_IMPEGNO_ATTO: "",
    CONTRIBUTO_CREDITORE_DENOMINAZIONE: "",
    CONTRIBUTO_CREDITORE_SEDE: "",
    CONTRIBUTO_CREDITORE_IBAN: "",
    CONTRIBUTO_CREDITORE_CIG: "",
    CONTRIBUTO_CREDITORE_CUP: "",
    CONTRIBUTO_OGGETTO: "",
    CONTRIBUTO_IMPORTO: "",
    CONTRIBUTO_RITENUTA: "",
    CONTRIBUTO_SCADENZA: "",

    // Document date and signature
    DATA_DETERMINA: formattedCurrentDate,
    FIRMATARIO: (custom?.firmatario as string) || DA_COMPILARE,
  };
}

/**
 * Keywords that trigger this template when found in the document title.
 */
const LIQUIDATION_DETERMINATION_KEYWORDS = [
  "documento di liquidazione",
  "determina di liquidazione",
];

/**
 * Condition function for the template.
 * Requires invoice context and checks for specific keywords.
 */
function liquidationDeterminationCondition(
  title: string,
  context?: TemplateContext
): boolean {
  // Require invoice context
  if (!context) {
    return false;
  }

  const normalizedTitle = title.toLowerCase();

  // Check for specific keywords
  return LIQUIDATION_DETERMINATION_KEYWORDS.some((keyword) =>
    normalizedTitle.includes(keyword)
  );
}

/**
 * The Documento di Liquidazione document template.
 */
export const liquidationDeterminationTemplate: DocumentTemplate = {
  id: "liquidation-determination",
  name: "Documento di Liquidazione",
  description:
    "Documento ufficiale di liquidazione con tabelle fatture e contributi",
  kind: "text",
  priority: 20,
  condition: liquidationDeterminationCondition,
  template: LIQUIDATION_DETERMINATION_TEMPLATE,
  dataMapper: mapInvoiceToLiquidationDetermination,
};

// Register the template
templateRegistry.register(liquidationDeterminationTemplate);

// Export for direct use if needed
export {
  LIQUIDATION_DETERMINATION_TEMPLATE,
  mapInvoiceToLiquidationDetermination,
  DA_COMPILARE,
};
