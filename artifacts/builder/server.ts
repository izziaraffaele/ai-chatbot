import { createDocumentHandler } from "@/lib/artifacts/server";

/**
 * Builder Document Handler
 * 
 * Unlike text/code artifacts, the builder doesn't stream AI-generated content.
 * It creates an empty builder state that the user interacts with.
 */
export const builderDocumentHandler = createDocumentHandler<"builder">({
  kind: "builder",

  onCreateDocument: async ({ id, title, dataStream }) => {
    // Emit initialization signal to client
    await dataStream.custom({
      type: "data-builder-init",
      data: { id, title },
      transient: true,
    } as any);

    // Return empty initial state - the builder UI handles all interaction
    const initialContent = JSON.stringify({
      step: "settore",
      selectedSettore: null,
      selectedFigura: null,
      selectedFiguraDescrizione: null,
      selectedAda: [],
      moduli: [],
      titolo: title,
    });

    return initialContent;
  },

  onUpdateDocument: async ({ document, description, dataStream }) => {
    // Builder updates are handled client-side
    // This handler is called when saving the final state
    
    // Parse current content and return it
    // The actual update happens via the API
    return document.content || "";
  },
});

