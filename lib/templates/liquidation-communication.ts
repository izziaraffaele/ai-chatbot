/**
 * Liquidation Communication Template
 *
 * Template for generating "Comunicazione di Liquidazione" documents
 * based on invoice data. This is a standard Italian administrative document
 * used to request payment processing for invoices.
 *
 * Fields derived from invoice:
 * - Supplier info (name, VAT, IBAN, CIG/CUP)
 * - Invoice details (number, date, amount)
 * - Buyer info (unit name)
 *
 * Fields using placeholders:
 * - NUMERO_DETERMINA, ANNO_DETERMINA (administrative reference numbers)
 * - FIRMATARIO (signing officer)
 * - CAP/ART, IMPEGNO details
 */

import {
  createKeywordCondition,
  extractYear,
  formatCurrencyItalian,
  formatDateItalian,
  templateRegistry,
} from "./index";
import type { DocumentTemplate, TemplateContext } from "./types";

/**
 * The Comunicazione di Liquidazione template content.
 * Uses {{variableName}} placeholders that will be replaced with invoice data.
 */
const LIQUIDATION_TEMPLATE = `{{UNITA_PADRE}}
{{UNITA_PROPONENTE}}
---

# COMUNICAZIONE DI LIQUIDAZIONE

n. {{NUMERO_DETERMINA}} / {{ANNO_DETERMINA}}

**OGGETTO:** {{OGGETTO_DETERMINA}}

---

## Destinatario

**AL SERVIZIO FINANZIARIO**

Comunicazione di liquidazione della spesa complessiva di Euro {{IMPORTO_TOTALE}}.

---

## Richiamati i seguenti atti

* Delibera di Consiglio dell'Unione n. 54 del 20/12/2024:

  "Approvazione Documento unico di programmazione 2025/2029, annualità 2025, presa d'atto del perimetro di consolidamento del Bilancio consolidato 2024, approvazione del Bilancio di previsione finanziario 2025/2027 e allegati obbligatori";

* Delibera di Giunta dell'Unione n. 1 del 09/01/2025:

  "Approvazione del Piano Esecutivo di Gestione (PEG) 2025/2027".

---

## Premesse

Viste le fatture/note inerenti la spesa in oggetto e riscontrata la regolarità della stessa agli effetti contabili e fiscali, l'avvenuta regolare fornitura e/o prestazione e attesa l'opportunità di procedere alla liquidazione nell'importo complessivo di € {{IMPORTO_TOTALE}}.

Tenuto conto della preventiva istruttoria svolta dal responsabile del servizio in ordine alla regolarità del presente provvedimento, come risultante dal visto sottoscritto con firma digitale che compone la presente comunicazione di liquidazione.

Visto che il Responsabile del procedimento e il Dirigente, rispettivamente con l'apposizione del visto di regolarità tecnica e con la sottoscrizione del presente atto, attestano l'assenza di qualsiasi interesse finanziario o economico o qualsiasi altro interesse personale diretto o indiretto con riferimento allo specifico oggetto del presente procedimento (assenza di conflitto di interessi ex art. 6-bis della Legge n. 241 del 07.08.1990).

Dato atto che le ditte risultano regolari con il versamento dei contributi, come attestato dai relativi DURC (prot. Inail/Inps n. {{DURC_PROTOCOLLO}}) conservati agli atti.

---

## Liquidazione fatture/note

Si liquidano le fatture/note di seguito indicate e si richiede l'emissione dei corrispondenti mandati di pagamento.

**Dati di dettaglio**

| CAP/ART | IMPEGNO | CREDITORE | FATTURA |
| ------- | ------- | --------- | ------- |
| {{CAP_ART}} | **N.** {{IMPEGNO_NUMERO}}<br>**Anno** {{IMPEGNO_ANNO}}<br>**Atto** {{IMPEGNO_ATTO}} | **{{CREDITORE_DENOMINAZIONE}}**<br>{{CREDITORE_SEDE}}<br>**IBAN:** {{CREDITORE_IBAN}}<br>**CIG:** {{CREDITORE_CIG}}<br>**CUP:** {{CREDITORE_CUP}} | **Oggetto:** {{FATTURA_OGGETTO}}<br>**N:** {{FATTURA_NUMERO}}<br>**Del:** {{FATTURA_DATA}}<br>**Importo:** {{FATTURA_IMPORTO}}<br>**Scadenza:** {{FATTURA_SCADENZA}} |

---

## Sottoscrizione

Lì, {{DATA_DETERMINA}}

**IL DIRIGENTE**

{{FIRMATARIO}}

*(sottoscritto digitalmente ai sensi dell'art. 21 D.Lgs. n. 82/2005 e s.m.i.)*
`;

/**
 * Maps invoice context data to template variables.
 * Extracts available data from the invoice and uses placeholders for unknown fields.
 */
function mapInvoiceToLiquidation(
  context: TemplateContext
): Record<string, string> {
  const { metadata, validation } = context;

  // Get current date for the document
  const currentDate = new Date();
  const formattedCurrentDate = formatDateItalian(currentDate.toISOString());
  const currentYear = currentDate.getFullYear().toString();

  // Extract year from invoice date or use current year
  const invoiceYear = extractYear(metadata.date) ?? currentYear;

  // Format the total amount
  const importoTotale = metadata.totalAmount
    ? formatCurrencyItalian(metadata.totalAmount, metadata.currency)
    : validation.importoSpesa
      ? formatCurrencyItalian(validation.importoSpesa)
      : "";

  // Build supplier address from available data
  // Note: Full address parsing would require more XML extraction
  const creditoreAddress = metadata.supplierVatId
    ? `P.IVA: ${metadata.supplierVatId}`
    : "";

  return {
    // Header information - use buyer data or placeholders
    UNITA_PADRE: metadata.buyer ?? "",
    UNITA_PROPONENTE: metadata.buyer ?? "",

    // Administrative reference numbers - placeholders
    NUMERO_DETERMINA: "",
    ANNO_DETERMINA: invoiceYear,

    // Object description from invoice causale
    OGGETTO_DETERMINA:
      validation.descrizioneSpesa ??
      `Liquidazione fattura ${metadata.invoiceNumber ?? ""} - ${metadata.supplier ?? ""}`,

    // Total amount
    IMPORTO_TOTALE: importoTotale,

    // DURC protocol - placeholder
    DURC_PROTOCOLLO: "",

    // Budget details - placeholders
    CAP_ART: "",
    IMPEGNO_NUMERO: "",
    IMPEGNO_ANNO: invoiceYear,
    IMPEGNO_ATTO: "",

    // Supplier (Creditore) information
    CREDITORE_DENOMINAZIONE: metadata.supplier ?? "",
    CREDITORE_SEDE: creditoreAddress,
    CREDITORE_IBAN: validation.iban ?? "",
    CREDITORE_CIG: validation.cig ?? "",
    CREDITORE_CUP: validation.cup ?? "",

    // Invoice details
    FATTURA_OGGETTO:
      validation.descrizioneSpesa ?? `Fattura ${metadata.invoiceNumber ?? ""}`,
    FATTURA_NUMERO: metadata.invoiceNumber ?? "",
    FATTURA_DATA: formatDateItalian(metadata.date),
    FATTURA_IMPORTO: importoTotale,
    FATTURA_SCADENZA: "", // Would need to parse DatiPagamento for this

    // Document date and signature
    DATA_DETERMINA: formattedCurrentDate,
    FIRMATARIO: "",
  };
}

/**
 * Keywords that trigger this template when found in the document title.
 */
const LIQUIDATION_KEYWORDS = [
  "liquidazione",
  "comunicazione di liquidazione",
  "liquid",
  "pagamento fattura",
  "liquidare",
];

/**
 * The Comunicazione di Liquidazione document template.
 */
export const liquidationCommunicationTemplate: DocumentTemplate = {
  id: "liquidation-communication",
  name: "Comunicazione di Liquidazione",
  description:
    "Documento amministrativo per la richiesta di liquidazione di fatture",
  kind: "text",
  priority: 10, // High priority - specific template
  condition: createKeywordCondition(LIQUIDATION_KEYWORDS, true),
  template: LIQUIDATION_TEMPLATE,
  dataMapper: mapInvoiceToLiquidation,
};

// Register the template
templateRegistry.register(liquidationCommunicationTemplate);

// Export for direct use if needed
export { LIQUIDATION_TEMPLATE, mapInvoiceToLiquidation };
