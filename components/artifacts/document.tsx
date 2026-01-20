"use client";

import { useChat } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  HistoryIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toast } from "@/components/toast";
import { Toolbar } from "@/components/toolbar";
import { VersionFooter } from "@/components/version-footer";
import { useArtifact } from "@/hooks/use-artifact";
import {
  type DocumentMeta,
  type DocumentVersion,
  useCanvasTabs,
} from "@/hooks/use-canvas-tabs";
import { useChatDocument } from "@/hooks/use-chat-document";
import { isPendingDocumentId } from "@/lib/canvas";
import type { Document } from "@/lib/db/schema";
import { useTranslations } from "@/lib/i18n/use-translations";
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

      // Skip saving for pending documents (no real ID yet)
      if (isPendingDocumentId(documentId)) {
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
    // If tab has content defined (including empty string during streaming), use it
    // Check for undefined/null explicitly, NOT truthiness, because "" is valid streaming content
    if (tabArtifact?.content !== undefined && tabArtifact?.content !== null) {
      return typeof tabArtifact.content === "string" ? tabArtifact.content : "";
    }
    // Fall back to latest saved document
    return latestDocument?.content || "";
  }, [tabArtifact?.content, latestDocument?.content]);

  // Set initial index to the latest version (last item in versions array)
  const initialVersionIndex = Math.max(0, versions.length - 1);

  // Auto-save when streaming completes
  // This ensures newly created documents are persisted to the database for export
  // Note: We save directly to API without calling chatDocument.mutate() to avoid
  // disrupting the display state. The content continues to show from tab state.
  useEffect(() => {
    const status = tabArtifact?.status;
    const hasDbEntry = chatDocument.entries && chatDocument.entries.length > 0;
    const hasContent = currentContent && currentContent.length > 0;

    // If streaming just completed, document has content, but no DB entry exists - save it
    if (
      status === "idle" &&
      hasContent &&
      !hasDbEntry &&
      !isPendingDocumentId(documentId)
    ) {
      // Save directly to API without triggering mutate to avoid display issues
      fetch(`/api/document?id=${documentId}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          content: currentContent,
          kind,
        }),
      }).catch((error) => {
        console.error("Error auto-saving document:", error);
      });
    }
  }, [
    tabArtifact?.status,
    chatDocument.entries,
    currentContent,
    documentId,
    title,
    kind,
  ]);

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
  const t = useTranslations();

  // Session-scoped version history from tab meta
  const [viewingSessionVersionId, setViewingSessionVersionId] = useState<
    string | null
  >(null);

  // .doc export loading state
  const [isExportingDoc, setIsExportingDoc] = useState(false);

  // Handle .docx export
  const handleDownloadDoc = useCallback(async () => {
    const documentId = activeTab?.artifact.documentId;

    // Don't allow export for pending documents
    if (!documentId || isPendingDocumentId(documentId)) {
      toast({
        type: "error",
        description: t(
          "document.saveFirstToExport",
          "Save the document before exporting"
        ),
      });
      return;
    }

    setIsExportingDoc(true);

    try {
      const response = await fetch(
        `/api/document/export?id=${encodeURIComponent(documentId)}&format=docx`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || t("document.exportError", "Export failed")
        );
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "document"}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting document:", error);
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : t("document.exportError", "Export failed"),
      });
    } finally {
      setIsExportingDoc(false);
    }
  }, [activeTab?.artifact.documentId, title, t]);

  // Get session versions from tab meta
  const sessionVersions = useMemo<DocumentVersion[]>(() => {
    const meta = activeTab?.artifact.meta as DocumentMeta | undefined;
    return meta?.versions ?? [];
  }, [activeTab?.artifact.meta]);

  // Find the selected session version content
  const selectedSessionVersion = useMemo(() => {
    if (!viewingSessionVersionId) {
      return null;
    }
    return sessionVersions.find((v) => v.id === viewingSessionVersionId);
  }, [viewingSessionVersionId, sessionVersions]);

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
  // - If viewing a session version: show that version's content
  // - During streaming/pending: use currentContent from tab (updated by useTabStreamSync)
  // - Otherwise: use draftContent (user edits)
  const tabStatus = activeTab?.artifact.status;
  const isStreaming = tabStatus === "streaming" || tabStatus === "pending";
  const displayContent = selectedSessionVersion
    ? selectedSessionVersion.content
    : isStreaming
      ? currentContent
      : draftContent;

  // Check if we're viewing an old session version
  const isViewingSessionVersion = Boolean(selectedSessionVersion);

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
              tooltip={t("document.downloadTxt", "Download .txt")}
            />
            {/* Separator before Word download */}
            <div className="mx-1 h-4 w-px bg-border" />
            {/* Word document download - more prominent */}
            <button
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 font-medium text-sm transition-colors",
                isExportingDoc ||
                  isStreaming ||
                  isPendingDocumentId(activeTab?.artifact.documentId || "")
                  ? "cursor-not-allowed bg-muted text-muted-foreground opacity-50"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              disabled={
                isExportingDoc ||
                isStreaming ||
                isPendingDocumentId(activeTab?.artifact.documentId || "")
              }
              onClick={handleDownloadDoc}
              title={t("document.downloadDoc", "Download .doc")}
              type="button"
            >
              <FileTextIcon className="size-4" />
              <span className="hidden sm:inline">
                {t("document.downloadWord", "Word")}
              </span>
            </button>
          </ArtifactActions>
        }
        onClose={onClose}
        subtitle={
          isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-amber-400" />
              Generating...
            </span>
          ) : isViewingSessionVersion ? (
            <span className="flex items-center gap-2">
              <HistoryIcon className="size-3" />
              Viewing {selectedSessionVersion?.label}
            </span>
          ) : isDirty ? (
            "Saving changes..."
          ) : sessionVersions.length > 0 ? (
            <div className="flex items-center gap-2">
              <span>{updatedAt ? `Updated ${updatedAt}` : ""}</span>
              <SessionVersionSelector
                onSelect={setViewingSessionVersionId}
                selectedVersionId={viewingSessionVersionId}
                versions={sessionVersions}
              />
            </div>
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

      <ChatArtifactFooter visible={!isLatest || isViewingSessionVersion}>
        {isViewingSessionVersion ? (
          <SessionVersionFooter
            onRestoreToLatest={() => setViewingSessionVersionId(null)}
            versionLabel={selectedSessionVersion?.label || ""}
          />
        ) : (
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
        )}
      </ChatArtifactFooter>
    </ChatArtifact>
  );
}

// ============================================================================
// Session Version Components
// ============================================================================

type SessionVersionSelectorProps = {
  versions: DocumentVersion[];
  selectedVersionId: string | null;
  onSelect: (versionId: string | null) => void;
};

/**
 * Dropdown selector for session-scoped document versions.
 * Allows users to view previous versions created during the current session.
 */
function SessionVersionSelector({
  versions,
  selectedVersionId,
  onSelect,
}: SessionVersionSelectorProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <HistoryIcon className="size-3 text-muted-foreground" />
      <select
        aria-label="Select version"
        className="cursor-pointer rounded border-none bg-transparent px-1 py-0.5 text-muted-foreground text-xs transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        onChange={(e) => onSelect(e.target.value || null)}
        value={selectedVersionId || ""}
      >
        <option value="">Versione corrente</option>
        {versions
          .slice()
          .reverse()
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} – {new Date(v.createdAt).toLocaleTimeString("it-IT")}
            </option>
          ))}
      </select>
    </div>
  );
}

type SessionVersionFooterProps = {
  versionLabel: string;
  onRestoreToLatest: () => void;
};

/**
 * Footer shown when viewing a historical session version.
 * Provides a button to return to the current version.
 */
function SessionVersionFooter({
  versionLabel,
  onRestoreToLatest,
}: SessionVersionFooterProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span className="text-muted-foreground text-sm">
        Viewing {versionLabel} (session history)
      </span>
      <button
        className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
        onClick={onRestoreToLatest}
        type="button"
      >
        Back to current
      </button>
    </div>
  );
}
