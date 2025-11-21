import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";
import { getSession } from "../utils/runtime-utils";

export const createDocumentTool = createTool({
  id: "createDocument",
  description:
    "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
  inputSchema: z.object({
    title: z.string(),
    kind: z.enum(artifactKinds),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(artifactKinds),
    content: z.string(),
  }),
  execute: async ({ context, runtimeContext, writer }) => {
    const { title, kind } = context;
    const session = getSession(runtimeContext);
    const id = generateUUID();

    await writer?.custom({
      type: "data-kind",
      data: kind,
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

    const documentHandler = documentHandlersByArtifactKind.find(
      (documentHandlerByArtifactKind) =>
        documentHandlerByArtifactKind.kind === kind
    );

    if (!documentHandler) {
      throw new Error(`No document handler found for kind: ${kind}`);
    }

    if (writer && session) {
      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream: writer,
        session,
      });
    }

    await writer?.custom({
      type: "data-finish",
      data: null,
      transient: true,
    } as any);

    return {
      id,
      title,
      kind,
      content: "A document was created and is now visible to the user.",
    };
  },
});
