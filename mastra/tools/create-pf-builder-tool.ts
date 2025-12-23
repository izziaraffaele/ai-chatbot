import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateUUID } from "@/lib/utils";

/**
 * Create PF Builder Tool
 *
 * Opens the interactive Percorso Formativo builder in the canvas.
 * This builder allows creating professional training paths based on
 * Regione Toscana qualifications catalog.
 */
export const createPFBuilderTool = createTool({
  id: "createPFBuilder",
  description: `Apre il builder interattivo per creare un Percorso Formativo (PF) basato sulle qualifiche della Regione Toscana.

Usa questo strumento quando l'utente vuole:
- Creare un nuovo Percorso Formativo
- Configurare un percorso con Unità Formative (UF)
- Scegliere settori, figure professionali e competenze ADA
- Costruire un percorso di qualifica professionale

Il builder guiderà l'utente attraverso:
1. Scelta del tipo (Qualifica o Certificazione)
2. Inserimento delle Unità Formative (UF)
3. Per ogni UF: selezione di Settore, Figura, ADA
4. Per ogni ADA: selezione di Capacità e Conoscenze
5. Riepilogo finale e creazione

IMPORTANTE: Dopo aver aperto il builder, invia un messaggio di benvenuto che guidi l'utente.`,
  inputSchema: z.object({
    context: z
      .string()
      .describe(
        "Contesto della richiesta utente che ha portato all'apertura del builder"
      ),
    titolo: z
      .string()
      .optional()
      .describe("Titolo suggerito per il percorso formativo"),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.literal("pf-builder"),
    message: z.string(),
    welcomeMessage: z.string(),
  }),
  execute: async ({ context, writer }) => {
    const { titolo } = context;
    const id = generateUUID();
    const title = titolo || "Nuovo Percorso Formativo";

    // Emit artifact initialization events
    await writer?.custom({
      type: "data-kind",
      data: "pf-builder",
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

    // Emit initial builder state
    const initialState = {
      step: "SELECT_TYPE",
      tipo: null,
      titolo: title,
      unitaFormative: [],
      currentUfIndex: null,
      currentAdaIndex: null,
      tempSelectedAdaIds: [],
      errors: {},
      isLoading: false,
    };

    await writer?.custom({
      type: "data-pf-builder-init",
      data: { id, title, initialState },
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-finish",
      data: null,
      transient: true,
    } as any);

    // Welcome message to be sent after opening the builder
    const welcomeMessage = `Ho aperto il Percorso Formativo Builder! 🎓

Puoi iniziare selezionando **"Qualifica"** nel pannello a destra.

Una volta scelto il tipo di percorso, potrai:
- Aggiungere le **Unità Formative (UF)** direttamente nel canvas
- Oppure scrivermi qui i nomi delle UF che vuoi creare

Per ogni UF potrai poi selezionare:
1. Il **Settore** professionale
2. La **Figura Professionale** 
3. Le **Aree di Attività (ADA)**
4. Le **Capacità** e **Conoscenze** specifiche

Inizia quando vuoi! Se hai bisogno di suggerimenti, chiedimi pure.`;

    return {
      id,
      title,
      kind: "pf-builder" as const,
      message: `Ho aperto il builder per creare il percorso formativo "${title}".`,
      welcomeMessage,
    };
  },
});
