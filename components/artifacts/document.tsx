"use client";

import { useChat } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useChatRuntime } from "@/components/chat";
import {
  ArtifactDraftProvider,
  type ArtifactVersion,
  ArtifactVersionProvider,
  ChatArtifact,
  ChatArtifactAction,
  ChatArtifactBody,
  ChatArtifactFooter,
  ChatArtifactHeader,
  useArtifactDraft,
  useArtifactVersion,
} from "@/components/chat/artifact";
import { Toolbar } from "@/components/toolbar";
import { VersionFooter } from "@/components/version-footer";
import { useArtifact } from "@/hooks/use-artifact";
import { useChatDocument } from "@/hooks/use-chat-document";
import type { Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { artifactDefinitions } from "../artifact";

export type DocumentArtifactProps = {
  documentId: string;
  kind: "text" | "code" | "sheet";
  title: string;
  isReadonly?: boolean;
  className?: string;
};

/**
 * DocumentArtifact
 * Complete document artifact composition using chat primitives
 * Supports text, code, and sheet documents with versioning and auto-save
 */
export function DocumentArtifact({
  documentId,
  kind,
  title,
  className,
}: DocumentArtifactProps) {
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });
  const { artifact, metadata, setMetadata, setArtifact } = useArtifact();
  const chatDocument = useChatDocument(documentId);

  // Find artifact definition (text, code, or sheet)
  const artifactDefinition = artifactDefinitions.find(
    (def) => def.kind === kind
  );

  if (!artifactDefinition) {
    throw new Error(`Artifact definition not found for kind: ${kind}`);
  }

  // Convert Document[] to ArtifactVersion[]
  const versions = useMemo<ArtifactVersion<string>[]>(() => {
    return (chatDocument.entries || []).map((doc: Document) => ({
      id: doc.id,
      content: doc.content || "",
      createdAt: doc.createdAt,
      metadata: {},
    }));
  }, [chatDocument.entries]);

  // Handle close
  const handleClose = useCallback(() => {
    setArtifact((current) => ({
      ...current,
      isVisible: false,
    }));
  }, [setArtifact]);

  // Save handler
  const handleSave = useCallback(
    async (content: string) => {
      if (!artifact) {
        return;
      }

      await chatDocument.mutate(
        async (currentDocuments) => {
          if (!currentDocuments) {
            return [];
          }

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            return currentDocuments;
          }

          if (currentDocument.content !== content) {
            await fetch(`/api/document?id=${documentId}`, {
              method: "POST",
              body: JSON.stringify({
                title,
                content,
                kind,
              }),
            });

            const newDocument: Document = {
              ...currentDocument,
              content,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }

          return currentDocuments;
        },
        { revalidate: false }
      );
    },
    [artifact, chatDocument, documentId, title, kind]
  );

  // Get initial content for draft provider
  const initialContent = artifact.content || "";

  return (
    <ArtifactVersionProvider
      initialIndex={-1}
      initialMode="edit"
      versions={versions}
    >
      <ArtifactDraftProvider
        initialContent={initialContent}
        onSaveAction={handleSave}
      >
        <DocumentArtifactContent
          artifactDefinition={artifactDefinition}
          chatDocument={chatDocument}
          className={className}
          isToolbarVisible={isToolbarVisible}
          metadata={metadata}
          onClose={handleClose}
          sendMessage={chat.sendMessage}
          setIsToolbarVisible={setIsToolbarVisible}
          setMessages={chat.setMessages}
          setMetadata={setMetadata}
          status={chat.status}
          stop={chat.stop}
          title={title}
        />
      </ArtifactDraftProvider>
    </ArtifactVersionProvider>
  );
}

type DocumentArtifactContentProps = {
  artifactDefinition: any;
  chatDocument: ReturnType<typeof useChatDocument>;
  title: string;
  isToolbarVisible: boolean;
  setIsToolbarVisible: (visible: boolean) => void;
  onClose: () => void;
  sendMessage: any;
  setMessages: any;
  status: any;
  stop: any;
  className?: string;
  metadata: Record<string, any>;
  setMetadata: React.Dispatch<React.SetStateAction<Record<string, any>>>;
};

function DocumentArtifactContent({
  artifactDefinition,
  chatDocument,
  title,
  isToolbarVisible,
  setIsToolbarVisible,
  onClose,
  sendMessage,
  setMessages,
  status,
  stop,
  className,
  metadata,
  setMetadata,
}: DocumentArtifactContentProps) {
  const { artifact } = useArtifact();
  const { currentIndex, isLatest, mode } = useArtifactVersion();
  const {
    isDirty,
    content: draftContent,
    setContent,
  } = useArtifactDraft<string>();

  const currentEntry = chatDocument.entries?.[currentIndex];

  // Calculate updated time
  const updatedAt = useMemo(() => {
    if (!currentEntry) {
      return null;
    }
    return formatDistance(new Date(currentEntry.createdAt), new Date(), {
      addSuffix: true,
    });
  }, [currentEntry]);

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <>
            <ChatArtifactAction.PrevVersion
              icon={<ChevronLeftIcon className="size-4" />}
              tooltip="Previous version"
            />
            <ChatArtifactAction.NextVersion
              icon={<ChevronRightIcon className="size-4" />}
              tooltip="Next version"
            />
            <ChatArtifactAction.ToggleMode
              icon={<EyeIcon className="size-4" />}
            />
            <ChatArtifactAction.Copy
              content={draftContent}
              icon={<CopyIcon className="size-4" />}
              tooltip="Copy content"
            />
            <ChatArtifactAction.Download
              content={draftContent}
              filename={`${title}.txt`}
              icon={<DownloadIcon className="size-4" />}
              tooltip="Download"
            />
          </>
        }
        onClose={onClose}
        subtitle={
          isDirty ? (
            "Saving changes..."
          ) : updatedAt ? (
            `Updated ${updatedAt}`
          ) : (
            <span className="mt-2 inline-block h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
          )
        }
        title={title}
      />

      <ChatArtifactBody
        toolbar={
          isLatest ? (
            <Toolbar
              artifactKind={artifactDefinition.kind}
              isToolbarVisible={isToolbarVisible}
              sendMessage={sendMessage}
              setIsToolbarVisible={setIsToolbarVisible}
              setMessages={setMessages}
              status={status}
              stop={stop}
            />
          ) : null
        }
      >
        <artifactDefinition.content
          content={draftContent}
          currentVersionIndex={currentIndex}
          getDocumentContentById={(id: number) =>
            chatDocument.entries[id]?.content || ""
          }
          isCurrentVersion={isLatest}
          isInline={false}
          isLoading={chatDocument.isLoading && !artifact.content}
          metadata={metadata}
          mode={mode}
          onSaveContent={setContent}
          setMetadata={setMetadata}
          status={artifact.status}
          suggestions={[]}
          title={title}
        />
      </ChatArtifactBody>

      <ChatArtifactFooter visible={!isLatest}>
        <VersionFooter
          currentVersionIndex={currentIndex}
          documents={chatDocument.entries}
          handleVersionChange={() => {
            // This is handled by the version provider now
            // but VersionFooter still expects this prop
          }}
        />
      </ChatArtifactFooter>
    </ChatArtifact>
  );
}
