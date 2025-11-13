import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import { getDocumentById } from '@/lib/db/queries';
import { getSession } from '../utils/runtime-utils';

export const updateDocumentTool = createTool({
  id: 'updateDocument',
  description: 'Update a document with the given description.',
  inputSchema: z.object({
    id: z.string().describe('The ID of the document to update'),
    description: z
      .string()
      .describe('The description of changes that need to be made'),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(['text', 'code', 'sheet', 'image']),
    content: z.string(),
  }),
  execute: async ({ context, runtimeContext, writer }) => {
    const { id, description } = context;

    const session = getSession(runtimeContext);

    const document = await getDocumentById({ id });

    if (!document) {
      throw new Error('Document not found');
    }

    await writer?.write({
      type: 'data-clear',
      data: null,
      transient: true,
    });

    const documentHandler = documentHandlersByArtifactKind.find(
      (documentHandlerByArtifactKind) =>
        documentHandlerByArtifactKind.kind === document.kind
    );

    if (!documentHandler) {
      throw new Error(`No document handler found for kind: ${document.kind}`);
    }

    if (writer && session) {
      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream: writer,
        session,
      });
    }

    await writer?.write({ type: 'data-finish', data: null, transient: true });

    return {
      id,
      title: document.title,
      kind: document.kind,
      content: 'The document has been updated successfully.',
    };
  },
});
