/**
 * Document Generator for Percorso Formativo
 *
 * Generates a well-formatted Italian Markdown document summarizing
 * the entire Percorso Formativo structure.
 */

import type { PFBuilderState, UnitaFormativa } from "./types";

/**
 * Generate a formatted Markdown document from PF Builder state
 * Structure: PF → UF → Settore → Figura → ADA → Capacità/Conoscenze
 */
export function generatePFDocument(state: PFBuilderState): string {
  const lines: string[] = [];

  // Header
  const title = state.titolo || "Percorso Formativo";
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`**Tipo:** ${formatTipo(state.tipo)}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Summary stats
  const totalUf = state.unitaFormative.length;
  const totalAda = state.unitaFormative.reduce(
    (sum, uf) => sum + uf.adaList.length,
    0
  );
  lines.push(`> **Riepilogo:** ${totalUf} Unità Formative, ${totalAda} ADA totali`);
  lines.push("");

  // Each UF
  state.unitaFormative.forEach((uf, ufIndex) => {
    lines.push(...generateUfSection(uf, ufIndex + 1));
  });

  return lines.join("\n");
}

/**
 * Format the PF type for display
 */
function formatTipo(tipo: string | null): string {
  if (!tipo) return "Non specificato";
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

/**
 * Generate Markdown section for a single Unità Formativa
 */
function generateUfSection(uf: UnitaFormativa, index: number): string[] {
  const lines: string[] = [];

  // UF Header
  lines.push(`## ${index}. ${uf.nome}`);
  lines.push("");

  // Settore
  if (uf.settore) {
    lines.push("### Settore");
    lines.push(`${capitalizeFirstLetter(uf.settore)}`);
    lines.push("");
  }

  // Figura Professionale
  if (uf.figura) {
    lines.push("### Figura Professionale");
    lines.push(`**${uf.figura}**`);
    if (uf.figuraDescrizione) {
      lines.push("");
      lines.push(`*${uf.figuraDescrizione}*`);
    }
    lines.push("");
  }

  // ADA list
  if (uf.adaList.length > 0) {
    lines.push("### Aree di Attività (ADA)");
    lines.push("");

    uf.adaList.forEach((ada, adaIndex) => {
      lines.push(`#### ${adaIndex + 1}. ${ada.adaName}`);
      if (ada.uc) {
        lines.push(`**Codice UC:** ${ada.uc}`);
      }
      lines.push("");

      // Capacità
      if (ada.selectedCapacita.length > 0) {
        lines.push("##### Capacità");
        ada.selectedCapacita.forEach((cap) => {
          lines.push(`- ${cap}`);
        });
        lines.push("");
      }

      // Conoscenze
      if (ada.selectedConoscenze.length > 0) {
        lines.push("##### Conoscenze");
        ada.selectedConoscenze.forEach((con) => {
          lines.push(`- ${con}`);
        });
        lines.push("");
      }
    });
  }

  lines.push("---");
  lines.push("");

  return lines;
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate a document title based on state
 */
export function generateDocumentTitle(state: PFBuilderState): string {
  if (state.titolo) {
    return `Riepilogo - ${state.titolo}`;
  }
  return "Riepilogo Percorso Formativo";
}

