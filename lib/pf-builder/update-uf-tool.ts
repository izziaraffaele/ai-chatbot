"use client";

import type { ClientTool } from "@mastra/client-js";
import { z } from "zod";
import { emitChatUpdateUF, pfBuilderEventBus } from "./event-bus";
import type { PFBuilderAction, PFBuilderState, UfInput } from "./types";
import { UfBulkOperationSchema, UfInputSchema } from "./types";

/**
 * PF Builder Update UF Client Tool
 *
 * This tool allows the chat agent to add or replace Unità Formative (UF)
 * in the PF Builder canvas via natural language commands.
 */

// Tool ID constant
export const PF_BUILDER_UPDATE_UF_TOOL_ID = "pfBuilderUpdateUF";

/**
 * Input schema for the pfBuilderUpdateUF tool
 */
export const pfBuilderUpdateUFInputSchema = z.object({
  uf: z
    .array(UfInputSchema)
    .min(1, "Inserisci almeno una UF")
    .describe("Lista di Unità Formative da aggiungere o sostituire"),
  operation: UfBulkOperationSchema.default("merge").describe(
    'Operazione: "merge" per aggiungere (default), "replace" per sostituire tutte'
  ),
});

/**
 * Output schema for the pfBuilderUpdateUF tool
 */
export const pfBuilderUpdateUFOutputSchema = z.object({
  success: z.boolean(),
  operation: UfBulkOperationSchema,
  addedUf: z
    .array(z.string())
    .describe("Nomi delle UF aggiunte (esclude duplicati)"),
  totalUf: z.number().describe("Numero totale di UF nel builder"),
  message: z.string().describe("Messaggio di conferma per l'utente"),
  skippedDuplicates: z.array(z.string()).optional(),
});

export type PFBuilderUpdateUFInput = z.infer<typeof pfBuilderUpdateUFInputSchema>;
export type PFBuilderUpdateUFOutput = z.infer<typeof pfBuilderUpdateUFOutputSchema>;

/**
 * Validate and clean UF input
 * - Trims whitespace from names
 * - Removes empty entries
 * - Removes duplicates (case-insensitive, keeps first)
 */
function cleanUfInput(uf: UfInput[]): {
  validUf: UfInput[];
  duplicates: string[];
} {
  const seenNames = new Set<string>();
  const validUf: UfInput[] = [];
  const duplicates: string[] = [];

  for (const item of uf) {
    const trimmedName = item.nome.trim();
    if (!trimmedName) continue;

    const lowerName = trimmedName.toLowerCase();
    if (seenNames.has(lowerName)) {
      duplicates.push(trimmedName);
      continue;
    }

    seenNames.add(lowerName);
    validUf.push({
      nome: trimmedName,
      descrizione: item.descrizione?.trim(),
    });
  }

  return { validUf, duplicates };
}

/**
 * Create the pfBuilderUpdateUF client tool
 *
 * @param getCurrentState - Function to get the current builder state
 * @param dispatch - Function to dispatch actions to the builder
 * @returns Client tool definition
 */
export function createPFBuilderUpdateUFTool(
  getCurrentState: () => PFBuilderState | null,
  dispatch: (action: PFBuilderAction) => void
): ClientTool<
  typeof pfBuilderUpdateUFInputSchema,
  typeof pfBuilderUpdateUFOutputSchema
> {
  return {
    id: PF_BUILDER_UPDATE_UF_TOOL_ID,
    description: `Strumento per aggiungere o sostituire Unità Formative (UF) nel Percorso Formativo Builder.

Usa questo strumento quando l'utente scrive le UF in chat, ad esempio:
- Elenco puntato: "- Analisi dati\\n- Programmazione\\n- Database"
- Lista separata da virgole: "UF: Analisi, Programmazione, Database"
- Frase naturale: "Aggiungi le UF Marketing e Vendite"

Operazioni disponibili:
- "merge" (default): Aggiunge le nuove UF mantenendo quelle esistenti
- "replace": Sostituisce tutte le UF esistenti con quelle nuove

Usare "replace" solo se l'utente dice esplicitamente "sostituisci", "ricomincia con", o "le UF sono solo queste".`,
    inputSchema: pfBuilderUpdateUFInputSchema,
    outputSchema: pfBuilderUpdateUFOutputSchema,
    execute: async ({ context }) => {
      const state = getCurrentState();

      // Check if builder is active
      if (!state) {
        return {
          success: false,
          operation: context.operation ?? "merge",
          addedUf: [],
          totalUf: 0,
          message:
            "Il Percorso Formativo Builder non è attivo. Aprilo prima di aggiungere UF.",
        };
      }

      // Check if we're in the right step (UF_INPUT or later)
      if (state.step === "SELECT_TYPE") {
        return {
          success: false,
          operation: context.operation ?? "merge",
          addedUf: [],
          totalUf: state.unitaFormative.length,
          message:
            'Seleziona prima il tipo di percorso (Qualifica o Certificazione) nel canvas, poi potrai aggiungere le UF.',
        };
      }

      // Clean and validate input
      const { validUf, duplicates: inputDuplicates } = cleanUfInput(context.uf);

      if (validUf.length === 0) {
        return {
          success: false,
          operation: context.operation ?? "merge",
          addedUf: [],
          totalUf: state.unitaFormative.length,
          message: "Nessuna UF valida da aggiungere. Specifica almeno un nome.",
          skippedDuplicates: inputDuplicates,
        };
      }

      const operation = context.operation ?? "merge";

      // For merge, check which UF already exist
      let skippedDuplicates: string[] = [...inputDuplicates];
      let ufToAdd = validUf;

      if (operation === "merge") {
        const existingNames = new Set(
          state.unitaFormative.map((uf) => uf.nome.toLowerCase())
        );
        ufToAdd = validUf.filter((u) => {
          const exists = existingNames.has(u.nome.toLowerCase());
          if (exists) {
            skippedDuplicates.push(u.nome);
          }
          return !exists;
        });

        if (ufToAdd.length === 0) {
          return {
            success: true,
            operation,
            addedUf: [],
            totalUf: state.unitaFormative.length,
            message:
              "Tutte le UF specificate esistono già nel builder. Non sono state aggiunte duplicati.",
            skippedDuplicates,
          };
        }
      }

      // Dispatch the action
      if (operation === "replace") {
        dispatch({ type: "BULK_REPLACE_UF", payload: { uf: validUf } });
      } else {
        dispatch({ type: "BULK_ADD_UF", payload: { uf: ufToAdd } });
      }

      // Emit event for chat-canvas sync
      emitChatUpdateUF(operation === "replace" ? validUf : ufToAdd, operation);

      // Calculate results
      const addedNames =
        operation === "replace"
          ? validUf.map((u) => u.nome)
          : ufToAdd.map((u) => u.nome);

      const newTotal =
        operation === "replace"
          ? validUf.length
          : state.unitaFormative.length + ufToAdd.length;

      // Build confirmation message
      let message: string;
      if (operation === "replace") {
        message = `Ho sostituito le UF esistenti con ${addedNames.length} nuove Unità Formative: ${addedNames.join(", ")}.`;
      } else if (addedNames.length === 1) {
        message = `Ho aggiunto l'Unità Formativa "${addedNames[0]}" al canvas.`;
      } else {
        message = `Ho aggiunto ${addedNames.length} Unità Formative al canvas: ${addedNames.join(", ")}.`;
      }

      if (skippedDuplicates.length > 0 && operation === "merge") {
        message += ` (${skippedDuplicates.length} UF duplicate ignorate)`;
      }

      return {
        success: true,
        operation,
        addedUf: addedNames,
        totalUf: newTotal,
        message,
        skippedDuplicates:
          skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
      };
    },
  };
}

