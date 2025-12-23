"use client";

import type { ClientTool } from "@mastra/client-js";
import { z } from "zod";
import type { FigurePerSettore } from "./data-loader";
import type { PFBuilderState, UnitaFormativa } from "./types";

/**
 * PF Builder Suggest Figures Client Tool
 *
 * This tool allows the chat agent to request figure suggestions
 * when the user is in the UF_FIGURE step.
 */

// Tool ID constant
export const PF_BUILDER_SUGGEST_FIGURES_TOOL_ID = "pfBuilderSuggestFigures";

/**
 * Schema for a single UF's suggestion request
 */
const UfSuggestionRequestSchema = z.object({
  ufId: z.string(),
  ufNome: z.string(),
  settore: z.string(),
});

/**
 * Schema for a single figure in the available figures list
 */
const FiguraInfoSchema = z.object({
  denominazione_figura: z.string(),
  descrizione: z.string(),
});

/**
 * Input schema for the pfBuilderSuggestFigures tool
 */
export const pfBuilderSuggestFiguresInputSchema = z.object({
  // The tool will be called without parameters - it reads state internally
});

/**
 * Schema for a single figure suggestion
 */
const FiguraSuggestionSchema = z.object({
  denominazione_figura: z.string(),
  motivazione: z.string(),
});

/**
 * Schema for suggestions for a single UF
 */
const UfSuggestionsSchema = z.object({
  ufId: z.string(),
  ufNome: z.string(),
  settore: z.string(),
  suggestions: z.array(FiguraSuggestionSchema),
});

/**
 * Output schema for the pfBuilderSuggestFigures tool
 */
export const pfBuilderSuggestFiguresOutputSchema = z.object({
  success: z.boolean(),
  ufSuggestions: z.array(UfSuggestionsSchema),
  message: z.string().describe("Formatted message with all suggestions"),
});

export type PFBuilderSuggestFiguresInput = z.infer<
  typeof pfBuilderSuggestFiguresInputSchema
>;
export type PFBuilderSuggestFiguresOutput = z.infer<
  typeof pfBuilderSuggestFiguresOutputSchema
>;
export type UfSuggestions = z.infer<typeof UfSuggestionsSchema>;
export type FiguraSuggestion = z.infer<typeof FiguraSuggestionSchema>;

/**
 * Build the prompt for the figure suggester agent
 */
function buildSuggestionPrompt(
  uf: UnitaFormativa,
  figures: Array<{ denominazione_figura: string; descrizione: string }>
): string {
  const figureList = figures
    .map(
      (f, i) => `${i + 1}. ${f.denominazione_figura}\n   Descrizione: ${f.descrizione.slice(0, 200)}...`
    )
    .join("\n\n");

  return `Analizza la seguente Unità Formativa e suggerisci le 3 Figure Professionali più adatte:

**Unità Formativa:** ${uf.nome}
${uf.descrizione ? `**Descrizione UF:** ${uf.descrizione}` : ""}
**Settore:** ${uf.settore}

**Figure Professionali disponibili nel settore "${uf.settore}":**

${figureList}

Per favore, suggerisci le 3 figure più adatte con una breve motivazione per ciascuna (1-2 frasi).
Rispondi SOLO con le tue 3 raccomandazioni nel seguente formato:
1. [Nome Figura]: [Motivazione]
2. [Nome Figura]: [Motivazione]
3. [Nome Figura]: [Motivazione]`;
}

/**
 * Parse the agent's response into structured suggestions
 */
function parseSuggestions(
  response: string,
  availableFigures: Array<{ denominazione_figura: string }>
): FiguraSuggestion[] {
  const suggestions: FiguraSuggestion[] = [];
  const lines = response.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // Match patterns like "1. Nome Figura: Motivazione" or "- Nome Figura: Motivazione"
    const match = line.match(/^[\d\-\*\.\)]+\s*(.+?):\s*(.+)$/);
    if (match) {
      const figuraName = match[1].trim();
      const motivazione = match[2].trim();

      // Find the closest matching figure name
      const matchedFigure = availableFigures.find(
        (f) =>
          f.denominazione_figura.toLowerCase().includes(figuraName.toLowerCase()) ||
          figuraName.toLowerCase().includes(f.denominazione_figura.toLowerCase().split(" ")[0])
      );

      if (matchedFigure) {
        suggestions.push({
          denominazione_figura: matchedFigure.denominazione_figura,
          motivazione,
        });
      } else {
        // If no exact match, still include it with the parsed name
        suggestions.push({
          denominazione_figura: figuraName,
          motivazione,
        });
      }
    }
  }

  return suggestions.slice(0, 3); // Ensure max 3 suggestions
}

/**
 * Format the suggestions into a human-readable message
 */
function formatSuggestionsMessage(ufSuggestions: UfSuggestions[]): string {
  if (ufSuggestions.length === 0) {
    return "Non ci sono Unità Formative da analizzare per i suggerimenti.";
  }

  const parts: string[] = [
    "🎯 **Ecco i miei suggerimenti per le Figure Professionali:**\n",
  ];

  for (const uf of ufSuggestions) {
    parts.push(`\n**${uf.ufNome}** (${uf.settore}):`);

    if (uf.suggestions.length === 0) {
      parts.push("- _Nessun suggerimento disponibile_");
    } else {
      for (let i = 0; i < uf.suggestions.length; i++) {
        const suggestion = uf.suggestions[i];
        parts.push(
          `${i + 1}. **${suggestion.denominazione_figura}**\n   _${suggestion.motivazione}_`
        );
      }
    }
  }

  parts.push(
    "\n\n💡 _Questi sono suggerimenti basati sui nomi delle UF. Puoi selezionare la figura che preferisci dal menu nel canvas._"
  );

  return parts.join("\n");
}

/**
 * Create the pfBuilderSuggestFigures client tool
 *
 * @param getCurrentState - Function to get the current builder state
 * @param getFigurePerSettore - Function to get figures per settore data
 * @param callSuggesterAgent - Function to call the figure suggester agent
 * @returns Client tool definition
 */
export function createPFBuilderSuggestFiguresTool(
  getCurrentState: () => PFBuilderState | null,
  getFigurePerSettore: () => Promise<FigurePerSettore>,
  callSuggesterAgent: (prompt: string) => Promise<string>
): ClientTool<
  typeof pfBuilderSuggestFiguresInputSchema,
  typeof pfBuilderSuggestFiguresOutputSchema
> {
  return {
    id: PF_BUILDER_SUGGEST_FIGURES_TOOL_ID,
    description: `Strumento per ottenere suggerimenti sulle Figure Professionali più adatte per le Unità Formative.

Usa questo strumento quando:
- L'utente è nello step UF_FIGURE del PF Builder
- L'utente chiede "consigliami", "suggerisci", "quale figura", "aiutami a scegliere"
- L'utente vuole sapere quali figure sono più adatte alle sue UF

Il tool analizza ogni UF e il suo settore, poi suggerisce le 3 figure professionali più pertinenti con una breve motivazione.`,
    inputSchema: pfBuilderSuggestFiguresInputSchema,
    outputSchema: pfBuilderSuggestFiguresOutputSchema,
    execute: async () => {
      const state = getCurrentState();

      // Check if builder is active
      if (!state) {
        return {
          success: false,
          ufSuggestions: [],
          message:
            "Il Percorso Formativo Builder non è attivo. Aprilo prima di chiedere suggerimenti.",
        };
      }

      // Check if we're in the right step
      if (state.step !== "UF_FIGURE") {
        return {
          success: false,
          ufSuggestions: [],
          message: `Per suggerire le figure professionali, devi prima completare la selezione dei settori. Attualmente sei allo step "${state.step}".`,
        };
      }

      // Check if there are UFs to suggest for
      const ufsToSuggest = state.unitaFormative.filter(
        (uf) => uf.settore && !uf.figura
      );

      if (ufsToSuggest.length === 0) {
        // All UFs already have figures selected
        const message =
          state.unitaFormative.length === 0
            ? "Non ci sono Unità Formative da analizzare."
            : "Tutte le Unità Formative hanno già una figura selezionata!";

        return {
          success: true,
          ufSuggestions: [],
          message,
        };
      }

      // Load figure data
      let figurePerSettore: FigurePerSettore;
      try {
        figurePerSettore = await getFigurePerSettore();
      } catch {
        return {
          success: false,
          ufSuggestions: [],
          message:
            "Errore nel caricamento delle figure professionali. Riprova più tardi.",
        };
      }

      // Generate suggestions for each UF
      const ufSuggestions: UfSuggestions[] = [];

      for (const uf of ufsToSuggest) {
        const figures = figurePerSettore[uf.settore ?? ""] ?? [];

        if (figures.length === 0) {
          ufSuggestions.push({
            ufId: uf.id,
            ufNome: uf.nome,
            settore: uf.settore ?? "",
            suggestions: [],
          });
          continue;
        }

        // Build prompt and get suggestions from agent
        const prompt = buildSuggestionPrompt(uf, figures);

        try {
          const response = await callSuggesterAgent(prompt);
          const suggestions = parseSuggestions(response, figures);

          ufSuggestions.push({
            ufId: uf.id,
            ufNome: uf.nome,
            settore: uf.settore ?? "",
            suggestions,
          });
        } catch (error) {
          console.error(`Error getting suggestions for UF ${uf.nome}:`, error);
          // Add empty suggestions on error
          ufSuggestions.push({
            ufId: uf.id,
            ufNome: uf.nome,
            settore: uf.settore ?? "",
            suggestions: [],
          });
        }
      }

      // Format message
      const message = formatSuggestionsMessage(ufSuggestions);

      return {
        success: true,
        ufSuggestions,
        message,
      };
    },
  };
}

