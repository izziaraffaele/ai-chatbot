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
import { codeArtifact } from "@/artifacts/code/client";
import { sheetArtifact } from "@/artifacts/sheet/client";
import { textArtifact } from "@/artifacts/text/client";
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
import { useChatRuntime } from "@/components/chat/context";
import { Toolbar } from "@/components/toolbar";
import { VersionFooter } from "@/components/version-footer";
import { useArtifact } from "@/hooks/use-artifact";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { useChatDocument } from "@/hooks/use-chat-document";
import type { Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ArtifactActions } from "../elements/artifact";

export const documentArtifactDefinitions = [
  textArtifact,
  codeArtifact,
  sheetArtifact,
];

export type DocumentArtifactKind =
  (typeof documentArtifactDefinitions)[number]["kind"];

export const isDocumentArtifact = (
  kind: string
): kind is DocumentArtifactKind => ["text", "code", "sheet"].includes(kind);

export type DocumentArtifactProps = {
  documentId: string;
  kind: DocumentArtifactKind;
  title: string;
  isReadonly?: boolean;
  className?: string;
};

/**
 * DocumentArtifact
 * Complete document artifact composition using chat primitives
 * Supports text, code, and sheet documents with versioning and auto-save
 *
 * Note: Streaming content is now synchronized to the tab state via useTabStreamSync
 * in the parent component. This component reads content from the tab directly.
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
  const { metadata, setMetadata } = useArtifact();
  const { activeTab, closeTab } = useCanvasTabs();
  const chatDocument = useChatDocument(documentId);

  // Find artifact definition (text, code, or sheet)
  const artifactDefinition = documentArtifactDefinitions.find(
    (def) => def.kind === kind
  );

  if (!artifactDefinition) {
    throw new Error(`Artifact definition not found for kind: ${kind}`);
  }

  // Convert Document[] to ArtifactVersion[]
  const versions = useMemo<ArtifactVersion<string>[]>(() => {
    if (!Array.isArray(chatDocument.entries)) {
      return [];
    }
    return chatDocument.entries.map((doc: Document) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content || "",
      createdAt: doc.createdAt,
      metadata: {},
    }));
  }, [chatDocument.entries]);

  // Handle close - closes the current tab
  const handleClose = useCallback(() => {
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [activeTab, closeTab]);

  // Save handler
  const handleSave = useCallback(
    async (content: string) => {
      if (!activeTab) {
        return;
      }

      try {
        const response = await fetch(`/api/document?id=${documentId}`, {
          method: "POST",
          body: JSON.stringify({
            title,
            content,
            kind,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save document");
        }

        // Revalidate the data to get the latest version
        await chatDocument.mutate();
      } catch (error) {
        console.error("Error saving document:", error);
        // Optionally show error message to user
      }
    },
    [activeTab, chatDocument, documentId, title, kind]
  );

  // Get content for the document
  // Priority: Tab artifact content (streaming via useTabStreamSync) > Latest saved version
  const tabArtifact = activeTab?.artifact;
  const latestDocument =
    chatDocument.entries?.[chatDocument.entries.length - 1];

  // Use tab content if available (this includes streaming content)
  // Otherwise fall back to the latest saved document content
  const currentContent = useMemo(() => {
    // If tab has content (including streaming content), use it
    if (tabArtifact?.content) {
      return typeof tabArtifact.content === "string" ? tabArtifact.content : "";
    }
    // Fall back to latest saved document
    return latestDocument?.content || "";
  }, [tabArtifact?.content, latestDocument?.content]);

  // Set initial index to the latest version (last item in versions array)
  const initialVersionIndex = Math.max(0, versions.length - 1);

  return (
    <ArtifactVersionProvider
      initialIndex={initialVersionIndex}
      initialMode="edit"
      versions={versions}
    >
      <ArtifactDraftProvider
        initialContent={currentContent}
        key={`draft-${documentId}-${tabArtifact?.status}`}
        onSaveAction={handleSave}
      >
        <DocumentArtifactContent
          artifactDefinition={artifactDefinition}
          chatDocument={chatDocument}
          className={className}
          currentContent={currentContent}
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
  /** Current content from tab (includes streaming content) */
  currentContent: string;
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
  currentContent,
}: DocumentArtifactContentProps) {
  const { activeTab } = useCanvasTabs();
  const { currentIndex, isLatest, mode, navigateVersion } =
    useArtifactVersion();
  const {
    isDirty,
    content: draftContent,
    setContent,
  } = useArtifactDraft<string>();

  const currentEntry = Array.isArray(chatDocument.entries)
    ? chatDocument.entries[currentIndex]
    : undefined;

  // Calculate updated time
  const updatedAt = useMemo(() => {
    if (!currentEntry) {
      return null;
    }
    return formatDistance(new Date(currentEntry.createdAt), new Date(), {
      addSuffix: true,
    });
  }, [currentEntry]);

  // Determine display content:
  // - During streaming/pending: use currentContent from tab (updated by useTabStreamSync)
  // - Otherwise: use draftContent (user edits)
  const tabStatus = activeTab?.artifact.status;
  const isStreaming = tabStatus === "streaming" || tabStatus === "pending";
  const displayContent = isStreaming ? currentContent : draftContent;

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <ArtifactActions>
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
              content={displayContent}
              icon={<CopyIcon className="size-4" />}
              tooltip="Copy content"
            />
            <ChatArtifactAction.Download
              content={displayContent}
              filename={`${title}.txt`}
              icon={<DownloadIcon className="size-4" />}
              tooltip="Download"
            />
          </ArtifactActions>
        }
        onClose={onClose}
        subtitle={
          isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-amber-400" />
              Generating...
            </span>
          ) : isDirty ? (
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
          isLatest && !isStreaming ? (
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
          content={displayContent}
          currentVersionIndex={currentIndex}
          getDocumentContentById={(versionIndex: number) => {
            // Ensure versionIndex is within bounds
            if (
              versionIndex >= 0 &&
              versionIndex < (chatDocument.entries?.length || 0)
            ) {
              return chatDocument.entries[versionIndex]?.content || "";
            }
            return "";
          }}
          isCurrentVersion={isLatest}
          isInline={false}
          isLoading={chatDocument.isLoading && !activeTab?.artifact.content}
          metadata={metadata}
          mode={mode}
          onSaveContent={setContent}
          setMetadata={setMetadata}
          status={activeTab?.artifact.status || "idle"}
          suggestions={[]}
          title={title}
        />
      </ChatArtifactBody>

      <ChatArtifactFooter visible={!isLatest}>
        <VersionFooter
          currentVersionIndex={currentIndex}
          documents={chatDocument.entries}
          handleVersionChange={(type) => {
            if (type === "toggle") {
              // Toggle between edit and diff modes when viewing old versions
              // For now, just navigate to latest
              navigateVersion("latest");
            } else {
              navigateVersion(type);
            }
          }}
        />
      </ChatArtifactFooter>
    </ChatArtifact>
  );
}
