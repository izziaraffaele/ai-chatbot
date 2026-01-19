/**
 * Liquidation Communication Template
 *
 * Template for generating "Comunicazione di Liquidazione" documents
 * from invoice data. Used by Fondazione CON IL SUD for payment communications.
 */

import { templateRegistry, type TemplateContext } from "./index";

/**
 * Template for Comunicazione di Liquidazione
 */
const liquidationTemplate = `# Comunicazione di Liquidazione

## Dati Fattura

| Campo | Valore |
|-------|--------|
| **Fornitore** | {{metadata.supplier}} |
| **Numero Fattura** | {{metadata.invoiceNumber}} |
| **Data Fattura** | {{metadata.date}} |
| **Importo Totale** | € {{metadata.totalAmount}} |
| **Codice CIG** | {{metadata.codiceCIG}} |
| **Codice CUP** | {{metadata.codiceCUP}} |

## Dati Pagamento

| Campo | Valore |
|-------|--------|
| **Scadenza Pagamento** | {{metadata.paymentDueDate}} |
| **IBAN** | {{metadata.iban}} |

## Esito Verifica

{{validation.summary}}

---

*Documento generato automaticamente dal sistema di gestione fatture.*
`;

/**
 * Register the liquidation communication template
 */
templateRegistry.register({
  id: "liquidation-communication",
  name: "Comunicazione di Liquidazione",
  kind: "text",
  keywords: [
    "liquidazione",
    "comunicazione di liquidazione",
    "comunicazione liquidazione",
    "pagamento fattura",
  ],
  template: liquidationTemplate,
  shouldMatch: (title: string, _context: TemplateContext) => {
    const normalizedTitle = title.toLowerCase();
    return (
      normalizedTitle.includes("liquidazione") ||
      normalizedTitle.includes("comunicazione") ||
      (normalizedTitle.includes("pagamento") &&
        normalizedTitle.includes("fattura"))
    );
  },
});


