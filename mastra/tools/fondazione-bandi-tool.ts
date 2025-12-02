/**
 * Fondazione Bandi Tool
 *
 * Single tool for managing Fondazione CON IL SUD bandi (announcements).
 * Supports two modes:
 * - list: Returns metadata for all bandi (no content)
 * - load: Returns full content for a specific bando
 *
 * This is the ONLY tool available to the sfc_asse agent.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  type BandoMetadata,
  listBandiMetadata,
  loadBandoByIdOrSlug,
} from "../utils/fondazione-kb-loader";

/**
 * Schema for bando metadata in list mode
 */
const bandoMetadataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  status: z.enum([
    "aperto",
    "chiuso",
    "scaduto",
    "in valutazione",
    "sconosciuto",
  ]),
  deadline: z.string().optional(),
});

/**
 * Schema for full bando in load mode
 */
const bandoFullSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  status: z.enum([
    "aperto",
    "chiuso",
    "scaduto",
    "in valutazione",
    "sconosciuto",
  ]),
  deadline: z.string().optional(),
  content: z.string(),
});

/**
 * Output schema for the fondazioneBandi tool
 */
const outputSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("list"),
    bandi: z.array(bandoMetadataSchema),
  }),
  z.object({
    mode: z.literal("load"),
    bando: bandoFullSchema,
  }),
  z.object({
    mode: z.literal("load"),
    error: z.string(),
  }),
]);

export type FondazioneBandiOutput = z.infer<typeof outputSchema>;

/**
 * Fondazione Bandi Tool
 *
 * Gestisce i bandi di Fondazione CON IL SUD.
 *
 * Usage:
 * - mode="list": Returns metadata for all available bandi (id, title, short description, status, deadline)
 * - mode="load": Loads the full content of a specific bando by ID, slug, or partial title match
 *
 * The agent should:
 * 1. First call with mode="list" to show available bandi
 * 2. Ask user to select a bando
 * 3. Call with mode="load" and bandoId to get full details
 */
export const fondazioneBandiTool = createTool({
  id: "fondazioneBandi",
  description: `Gestisce i bandi di Fondazione CON IL SUD.
- mode="list": restituisce l'elenco dei bandi con una descrizione molto breve (id, titolo, stato, scadenza).
- mode="load": carica il contenuto completo di un singolo bando (indicato con bandoId).

IMPORTANTE: Usa sempre "list" prima per mostrare i bandi disponibili, poi "load" solo quando l'utente sceglie un bando specifico.`,
  inputSchema: z.object({
    mode: z
      .enum(["list", "load"])
      .default("list")
      .describe(
        'Modalità: "list" per elencare i bandi, "load" per caricare un bando specifico'
      ),
    bandoId: z
      .string()
      .optional()
      .describe(
        'ID, slug o parte del titolo del bando da caricare (richiesto solo per mode="load")'
      ),
  }),
  outputSchema,
  execute: async ({ context }) => {
    const { mode, bandoId } = context as {
      mode: "list" | "load";
      bandoId?: string;
    };

    if (mode === "list") {
      const bandi = await Promise.resolve(listBandiMetadata());

      // Return only metadata, NO content
      return {
        mode: "list" as const,
        bandi: bandi.map((b: BandoMetadata) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          shortDescription: b.shortDescription,
          status: b.status,
          deadline: b.deadline,
        })),
      };
    }

    // mode === "load"
    if (!bandoId) {
      return {
        mode: "load" as const,
        error:
          'Per caricare un bando è necessario indicare bandoId (id, slug o parte del titolo). Usa mode="list" per vedere i bandi disponibili.',
      };
    }

    const result = await Promise.resolve(loadBandoByIdOrSlug(bandoId));

    if (!result) {
      // Get available bandi for suggestions
      const available = listBandiMetadata();
      const suggestions = available.map((b) => b.title).join(", ");

      return {
        mode: "load" as const,
        error: `Nessun bando trovato per "${bandoId}". Bandi disponibili: ${suggestions}`,
      };
    }

    const { metadata, content } = result;

    return {
      mode: "load" as const,
      bando: {
        id: metadata.id,
        slug: metadata.slug,
        title: metadata.title,
        shortDescription: metadata.shortDescription,
        status: metadata.status,
        deadline: metadata.deadline,
        content, // Full content only here
      },
    };
  },
});
