/**
 * Fondazione File System Browser Tool
 *
 * Tool for browsing the Fondazione CON IL SUD bandi file system.
 * Supports two actions:
 * - list: List contents of a directory (folders and files)
 * - read: Read the content of a specific file
 *
 * This tool is used by the sfcAssiAgent to provide an interactive
 * file browser widget in the canvas panel.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  type FondazioneFsItem,
  FondazioneFsNotFoundError,
  FondazioneFsSecurityError,
  listDirectory,
  readFileContent,
} from "../utils/fondazione-fs-loader";

/**
 * Schema for a file system item
 */
const fondazioneFsItemSchema = z.object({
  name: z.string(),
  type: z.enum(["file", "folder"]),
  path: z.string(),
  extension: z.string().optional(),
});

/**
 * Output schema for the fondazioneBrowser tool
 * Discriminated union based on action type
 */
const outputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    path: z.string(),
    items: z.array(fondazioneFsItemSchema),
  }),
  z.object({
    action: z.literal("read"),
    path: z.string(),
    extension: z.string().nullable(),
    content: z.string(),
  }),
  z.object({
    action: z.literal("error"),
    error: z.string(),
  }),
]);

export type FondazioneBrowserOutput = z.infer<typeof outputSchema>;
export type { FondazioneFsItem };

/**
 * Fondazione File System Browser Tool
 *
 * Permette di esplorare i file dei bandi di Fondazione CON IL SUD.
 *
 * Usage:
 * - action="list": Elenca il contenuto di una cartella (default: root)
 * - action="read": Legge il contenuto di un file specifico
 *
 * Il tool restituisce dati strutturati che vengono visualizzati
 * nel widget "Esplora Documenti" nel pannello laterale.
 */
export const fondazioneBrowserTool = createTool({
  id: "fondazioneBrowser",
  description: `Esplora i documenti di Fondazione CON IL SUD.
- action="list": Elenca cartelle e file in un percorso (default: radice documenti).
- action="read": Legge il contenuto di un file specifico (es. file .md o .csv).

IMPORTANTE: Usa questo strumento quando l'utente chiede di:
- "Mostrami i documenti" / "Fammi vedere i bandi" / "Esplora file" → action="list"
- "Apri il file X" / "Leggi il documento Y" → action="read" con path

Il risultato apre automaticamente il browser visuale nel pannello laterale.`,
  inputSchema: z.object({
    action: z
      .enum(["list", "read"])
      .default("list")
      .describe(
        'Azione: "list" per elencare contenuti, "read" per leggere un file'
      ),
    path: z
      .string()
      .optional()
      .describe(
        'Percorso relativo alla cartella bandi (vuoto = radice). Per "read", è obbligatorio.'
      ),
  }),
  outputSchema,
  execute: async ({ context }) => {
    const { action, path: inputPath } = context as {
      action: "list" | "read";
      path?: string;
    };

    // Normalize path: undefined or empty string becomes ""
    const normalizedPath = inputPath?.trim() || "";

    try {
      if (action === "list") {
        const items = listDirectory(normalizedPath);

        return {
          action: "list" as const,
          path: normalizedPath,
          items,
        };
      }

      // action === "read"
      if (!normalizedPath) {
        return {
          action: "error" as const,
          error:
            'Per leggere un file è necessario specificare il percorso (path). Usa action="list" per vedere i file disponibili.',
        };
      }

      const result = readFileContent(normalizedPath);

      return {
        action: "read" as const,
        path: result.path,
        extension: result.extension,
        content: result.content,
      };
    } catch (error) {
      // Handle known error types with user-friendly messages
      if (error instanceof FondazioneFsSecurityError) {
        return {
          action: "error" as const,
          error: error.message,
        };
      }

      if (error instanceof FondazioneFsNotFoundError) {
        return {
          action: "error" as const,
          error: error.message,
        };
      }

      // Unknown error
      console.error("[fondazioneBrowser] Unexpected error:", error);
      return {
        action: "error" as const,
        error:
          "Si è verificato un errore durante l'accesso ai file. Riprova più tardi.",
      };
    }
  },
});


