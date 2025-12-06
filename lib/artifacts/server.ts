import { Agent } from "@mastra/core/agent";
import type { ToolStream } from "@mastra/core/tools";
import type { Session } from "next-auth";
import { codeDocumentHandler } from "@/artifacts/code/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifacts";
import { mastra } from "@/mastra";
import type { LoadedInvoiceContext } from "@/mastra/utils/runtime-utils";
import { artifactSystemPrompt } from "../ai/prompts";
import { saveDocument } from "../db/queries";
import type { Document } from "../db/schema";

type StreamWriter = ToolStream<any>;

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
};

/** Props passed to document creation and update handlers */
export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: StreamWriter;
  session: Session;
  /** Mastra agent for generating document content */
  agent?: Agent;
  /** Invoice context for template-based document generation */
  invoiceContext?: LoadedInvoiceContext;
};

/** Props passed to document update handlers */
export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: StreamWriter;
  session: Session;
  /** Mastra agent for updating document content */
  agent?: Agent;
};

export type DocumentHandler<T = ArtifactKind> = {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

/**
 * Factory for creating document handlers with Mastra agent integration.
 * Lazily initializes agents to avoid startup overhead.
 *
 * @param config Handler configuration including artifact kind and optional model
 * @returns Document handler with create/update callbacks
 */
export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  model?: string;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  // Lazy initialization - create agent only when needed, not at module load time
  let documentExpert: Agent | null = null;

  const getDocumentExpert = (): Agent => {
    if (!documentExpert) {
      const artifactModel =
        config.model ||
        process.env.ARTIFACT_MODEL ||
        "openai/gpt-5-chat-latest";

      documentExpert = new Agent({
        name: `${config.kind}-document-expert`,
        instructions: artifactSystemPrompt,
        model: artifactModel,
        mastra,
      });
    }
    return documentExpert;
  };

  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        session: args.session,
        agent: getDocumentExpert(),
        invoiceContext: args.invoiceContext,
      });

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        session: args.session,
        agent: getDocumentExpert(),
      });

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
];

export const artifactKinds = ["text", "code", "sheet"] as const;
