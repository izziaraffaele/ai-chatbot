import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";
import { getSession } from "../utils/runtime-utils";

/**
 * Create Training Path Tool
 * 
 * Opens the interactive training path builder in the canvas.
 * Unlike document tools that stream AI-generated content,
 * this tool launches an interactive builder that the user navigates.
 */
export const createTrainingPathTool = createTool({
  id: "createTrainingPath",
  description: `Apre il builder interattivo per creare un percorso formativo professionale.
Usa questo strumento quando l'utente vuole:
- Creare un nuovo percorso formativo
- Esplorare le figure professionali della Regione Toscana
- Costruire un piano di formazione basato su competenze ADA
- Progettare un curriculum professionale

Il builder guiderà l'utente attraverso la selezione di:
1. Settore professionale
2. Figura professionale
3. Aree di Attività (ADA) / competenze
4. Configurazione moduli formativi

NON usare questo strumento per cercare informazioni sui percorsi - usa catalogSearch invece.`,
  inputSchema: z.object({
    context: z
      .string()
      .describe(
        "Contesto della richiesta utente che ha portato all'apertura del builder"
      ),
    suggestedSettore: z
      .string()
      .optional()
      .describe("Settore suggerito in base al contesto della conversazione"),
    suggestedFigura: z
      .string()
      .optional()
      .describe("Figura professionale suggerita in base al contesto"),
    titolo: z
      .string()
      .optional()
      .describe("Titolo suggerito per il percorso formativo"),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.literal("builder"),
    message: z.string(),
  }),
  execute: async ({ context, runtimeContext, writer }) => {
    const { context: input, suggestedSettore, suggestedFigura, titolo } = context;
    const session = getSession(runtimeContext);
    const id = generateUUID();
    const title = titolo || "Nuovo Percorso Formativo";

    // Emit artifact initialization events
    await writer?.custom({
      type: "data-kind",
      data: "builder",
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-id",
      data: id,
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-title",
      data: title,
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-clear",
      data: null,
      transient: true,
    } as any);

    // Emit initial builder state with any suggestions
    const initialState = {
      step: suggestedSettore ? "figura" : "settore",
      selectedSettore: suggestedSettore || null,
      selectedFigura: suggestedFigura || null,
      selectedFiguraDescrizione: null,
      selectedAda: [],
      moduli: [],
      titolo: title,
    };

    await writer?.custom({
      type: "data-builder-init",
      data: { id, title, initialState },
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-finish",
      data: null,
      transient: true,
    } as any);

    return {
      id,
      title,
      kind: "builder" as const,
      message: `Ho aperto il builder per creare il percorso formativo "${title}". Puoi selezionare il settore e la figura professionale che ti interessa, poi scegliere le competenze da includere nel percorso.`,
    };
  },
});

