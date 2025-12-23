"use client";

import type { ClientTool } from "@mastra/client-js";
import { z } from "zod";
import {
  formatEventMessage,
  type PFBuilderEventListener,
  pfBuilderEventBus,
} from "./event-bus";
import type { PFBuilderState } from "./types";

/**
 * PF Builder Client Tool
 *
 * This tool is registered when the PF Builder is open and allows
 * the chat agent to receive notifications about canvas interactions.
 */

// Tool ID constant
export const PF_BUILDER_TOOL_ID = "pfBuilderNotify";

/**
 * Input schema for the pfBuilderNotify tool
 * The agent can use this to understand what's happening in the builder
 */
export const pfBuilderNotifyInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Optional query about the current builder state"),
});

/**
 * Output schema for the pfBuilderNotify tool
 */
export const pfBuilderNotifyOutputSchema = z.object({
  type: z.string().describe("The type of event or response"),
  data: z.unknown().describe("Event data or state information"),
  message: z.string().describe("Human-readable message about the event"),
});

export type PFBuilderNotifyInput = z.infer<typeof pfBuilderNotifyInputSchema>;
export type PFBuilderNotifyOutput = z.infer<typeof pfBuilderNotifyOutputSchema>;

/**
 * Create the pfBuilderNotify client tool
 *
 * @param getCurrentState - Function to get the current builder state
 * @returns Client tool definition
 */
export function createPFBuilderNotifyTool(
  getCurrentState: () => PFBuilderState | null
): ClientTool<
  typeof pfBuilderNotifyInputSchema,
  typeof pfBuilderNotifyOutputSchema
> {
  return {
    id: PF_BUILDER_TOOL_ID,
    description: `Strumento per ricevere notifiche e informazioni dal Percorso Formativo Builder.
Usa questo strumento per:
- Ricevere aggiornamenti quando l'utente interagisce con il canvas
- Ottenere lo stato corrente del builder
- Comprendere le azioni dell'utente nel canvas

Gli eventi possibili includono:
- TYPE_SELECTED: l'utente ha selezionato il tipo di percorso
- UF_ADDED: l'utente ha aggiunto un'Unità Formativa
- UF_REMOVED: l'utente ha rimosso un'Unità Formativa
- SECTOR_SELECTED: l'utente ha selezionato un settore
- FIGURE_SELECTED: l'utente ha selezionato una figura professionale
- ADA_TOGGLED: l'utente ha selezionato/deselezionato un'ADA
- PF_COMPLETED: l'utente ha completato il percorso formativo`,
    inputSchema: pfBuilderNotifyInputSchema,
    outputSchema: pfBuilderNotifyOutputSchema,
    execute: async ({ context }) => {
      const state = getCurrentState();

      if (!state) {
        return {
          type: "ERROR",
          data: null,
          message: "Il builder non è attivo.",
        };
      }

      // Return current state summary
      const summary = buildStateSummary(state);

      return {
        type: "STATE_SUMMARY",
        data: {
          step: state.step,
          tipo: state.tipo,
          titolo: state.titolo,
          ufCount: state.unitaFormative.length,
          currentUfIndex: state.currentUfIndex,
          currentAdaIndex: state.currentAdaIndex,
        },
        message: summary,
      };
    },
  };
}

/**
 * Build a human-readable summary of the builder state
 */
function buildStateSummary(state: PFBuilderState): string {
  const parts: string[] = [];

  parts.push(`Il builder è allo step "${state.step}".`);

  if (state.titolo) {
    parts.push(`Titolo: "${state.titolo}".`);
  }

  if (state.unitaFormative.length > 0) {
    const completeCount = state.unitaFormative.filter(
      (uf) => uf.isComplete
    ).length;
    parts.push(
      `Ci sono ${state.unitaFormative.length} Unità Formative, di cui ${completeCount} complete.`
    );
  } else {
    parts.push("Non ci sono ancora Unità Formative.");
  }

  if (state.currentUfIndex !== null) {
    const uf = state.unitaFormative[state.currentUfIndex];
    if (uf) {
      parts.push(`L'utente sta configurando l'UF "${uf.nome}".`);
      if (uf.settore) {
        parts.push(`Settore selezionato: "${uf.settore}".`);
      }
      if (uf.figura) {
        parts.push(`Figura selezionata: "${uf.figura}".`);
      }
    }
  }

  return parts.join(" ");
}

/**
 * Hook to create and manage the PF Builder client tool registration
 */
export function usePFBuilderClientTool(
  register: (tool: ClientTool<any, any>) => void,
  deregister: (id: string) => void,
  getCurrentState: () => PFBuilderState | null,
  onCanvasEvent: (output: PFBuilderNotifyOutput) => void
) {
  // Create the tool
  const tool = createPFBuilderNotifyTool(getCurrentState);

  // Subscribe to canvas events and forward them as tool results
  const handleEvent: PFBuilderEventListener = (event) => {
    if (event.source === "canvas") {
      const message = formatEventMessage(event);
      onCanvasEvent({
        type: event.type,
        data: event.payload,
        message,
      });
    }
  };

  return {
    tool,
    register: () => {
      register(tool);
      return pfBuilderEventBus.subscribe(handleEvent);
    },
    deregister: () => {
      deregister(PF_BUILDER_TOOL_ID);
    },
  };
}
