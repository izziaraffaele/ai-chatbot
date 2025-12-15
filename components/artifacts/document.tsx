"use client";

import { formatDistance } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
  type UIArtifact,
  useArtifactDraft,
  useArtifactVersion,
} from "@/components/chat/artifact";
import { VersionFooter } from "@/components/version-footer";
import { useArtifact } from "@/hooks/use-artifact";
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
  artifact: UIArtifact<string, string>;
  isReadonly?: boolean;
  className?: string;
};

/**
 * DocumentArtifact
 * Complete document artifact composition using chat primitives
 * Supports text, code, and sheet documents with versioning and auto-save
 */
export function DocumentArtifact({
  artifact,
  className,
  isReadonly = false,
}: DocumentArtifactProps) {
  const { metadata, setMetadata, setArtifact } = useArtifact();

  console.log(
    `[DocumentArtifact] Render - status: ${artifact.status}, documentId: ${artifact.documentId}`
  );

  const {
    entries: documents,
    mutate,
    isLoading,
  } = useChatDocument(
    artifact.status === "streaming" ? null : artifact.documentId
  );

  // When artifact status changes from streaming to idle, revalidate documents
  useEffect(() => {
    console.log(
      `[DocumentArtifact] Status change - status: ${artifact.status}, documentId: ${artifact.documentId}`
    );
    if (artifact.status === "idle" && artifact.documentId) {
      console.log(
        `[DocumentArtifact] Triggering mutate for document: ${artifact.documentId}`
      );
      mutate();
    }
  }, [artifact.status, artifact.documentId, mutate]);

  const savedDocument = useMemo(() => {
    return documents.find((d) => d.id === artifact.documentId);
  }, [documents, artifact.documentId]);

  const handleClose = () => {
    setArtifact((v) => ({ ...v, isVisible: false }));
  };

  // Convert Document[] to ArtifactVersion[]
  const versions = useMemo<ArtifactVersion<string>[]>(() => {
    // Only convert if documents exist and is an array
    if (!Array.isArray(documents) || documents.length === 0) {
      if (!Array.isArray(documents)) {
        console.log("[DocumentArtifact] Documents is not an array:", documents);
      }
      return [];
    }
    console.log(documents);
    // Create a stable key for the documents to prevent unnecessary re-conversions
    const documentsKey = documents
      .map((doc) => `${doc.id}-${doc.createdAt}`)
      .join("|");
    console.log(
      `[DocumentArtifact] Converting documents to versions - count: ${documents.length}, key: ${documentsKey.substring(0, 50)}...`
    );

    const convertedVersions = documents.map((doc: Document) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content || "",
      createdAt: doc.createdAt,
      metadata: {},
    }));
    console.log(
      `[DocumentArtifact] Converted ${convertedVersions.length} versions:`,
      convertedVersions.map((v) => ({
        id: v.id,
        title: v.title,
        createdAt: v.createdAt,
      }))
    );
    return convertedVersions;
  }, [documents]);

  // Debounce ref to prevent multiple saves
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Save handler with debouncing
  const handleSave = useCallback(
    (content: string) => {
      console.log("[DocumentArtifact] handleSave called:", {
        hasArtifact: !!artifact,
        documentId: artifact?.documentId,
        contentLength: content?.length || 0,
      });

      if (!artifact) {
        console.log("[DocumentArtifact] No artifact, returning");
        return;
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        console.log("[DocumentArtifact] Clearing existing timeout");
        clearTimeout(saveTimeoutRef.current);
      }

      console.log("[DocumentArtifact] Setting new timeout for 1 second");
      // Debounce save to prevent multiple rapid saves
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("[DocumentArtifact] Saving document:", {
            documentId: artifact.documentId,
            title: artifact.title,
            contentLength: content?.length || 0,
            kind: artifact.kind,
          });

          const response = await fetch(
            `/api/document?id=${artifact.documentId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: artifact.title,
                content,
                kind: artifact.kind,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[DocumentArtifact] Save failed:", errorData);
            throw new Error(errorData.cause || "Failed to save document");
          }

          // Get the saved document data to confirm it was created
          const savedDocumentData = await response.json();
          console.log("[DocumentArtifact] Save successful:", savedDocumentData);

          // Revalidate the data to get the latest version
          // Use optimistic update for immediate UI response
          await mutate(
            async () => {
              // Fetch fresh data from server
              const freshResponse = await fetch(
                `/api/document?id=${artifact.documentId}`
              );
              if (!freshResponse.ok) {
                throw new Error("Failed to fetch updated document");
              }
              return freshResponse.json();
            },
            {
              optimisticData: (currentData) => {
                // Add the new version optimistically
                const newVersion = {
                  id: artifact.documentId, // Keep the same documentId
                  title: artifact.title,
                  content,
                  kind: artifact.kind as "text" | "code" | "sheet",
                  userId: "", // Will be filled by server response
                  createdAt: new Date(), // Use Date object to match schema
                };
                return [...(currentData || []), newVersion];
              },
              rollbackOnError: true,
              revalidate: true,
            }
          );

          // Optional: Show success feedback
          console.log("Document saved successfully:", savedDocumentData);
        } catch (error) {
          console.error("Error saving document:", error);
          // Re-throw to let the draft system handle the error
          throw error;
        }
      }, 1000); // 1 second debounce
    },
    [artifact, mutate]
  );

  console.log("[DocumentArtifact] Rendering with handleSave:", typeof handleSave);

  return (
    <ArtifactVersionProvider initialMode="edit" versions={versions}>
      <ArtifactDraftProvider
        initialContent={artifact.content}
        onSaveAction={handleSave}
      >
        <DocumentArtifactContent
          artifact={artifact}
          className={className}
          isLoading={isLoading}
          isReadonly={isReadonly}
          lastUpdatedAt={savedDocument?.createdAt}
          metadata={metadata}
          onClose={handleClose}
          setMetadata={setMetadata}
          versions={versions}
        />
      </ArtifactDraftProvider>
    </ArtifactVersionProvider>
  );
}

type DocumentArtifactContentProps = {
  artifact: UIArtifact<string, string>;
  versions: ArtifactVersion<string>[];
  lastUpdatedAt?: string | Date;
  onClose: () => void;
  className?: string;
  metadata?: any;
  isLoading?: boolean;
  isReadonly?: boolean;
  setMetadata: React.Dispatch<React.SetStateAction<any>>;
};

function DocumentArtifactContent({
  artifact,
  versions,
  lastUpdatedAt,
  onClose,
  className,
  metadata,
  isLoading = false,
  isReadonly,
  setMetadata,
}: DocumentArtifactContentProps) {
  const { currentIndex, isLatest, mode, navigateVersion } =
    useArtifactVersion();

  const {
    isDirty,
    content: draftContent,
    setContent,
  } = useArtifactDraft<string>();

  const artifactDefinition = documentArtifactDefinitions.find(
    (def) => def.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error(`Artifact definition not found for kind: ${artifact.kind}`);
  }

  let displayContent = versions[currentIndex]?.content || artifact.content;

  if (isDirty && !isReadonly) {
    displayContent = draftContent;
  }

  // Calculate updated time
  const formattedLastUpdate = useMemo(() => {
    return (
      lastUpdatedAt &&
      formatDistance(lastUpdatedAt, new Date(), {
        addSuffix: true,
      })
    );
  }, [lastUpdatedAt]);

  const subtitle = isDirty
    ? "Saving changes..."
    : formattedLastUpdate && `Updated ${formattedLastUpdate}`;

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
              filename={`${artifact.title}.txt`}
              icon={<DownloadIcon className="size-4" />}
              tooltip="Download"
            />
          </ArtifactActions>
        }
        onClose={onClose}
        subtitle={
          subtitle || (
            <span className="mt-2 inline-block h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
          )
        }
        title={artifact.title}
      />

      <ChatArtifactBody>
        <artifactDefinition.content
          content={displayContent}
          currentVersionIndex={currentIndex}
          getDocumentContentById={(versionIndex: number) => {
            // Ensure versionIndex is within bounds
            return (
              versions[versionIndex <= 0 ? 0 : versionIndex]?.content || ""
            );
          }}
          isCurrentVersion={isLatest}
          isInline={false}
          isLoading={displayContent.length === 0 && isLoading}
          metadata={metadata}
          mode={mode === "view" ? "edit" : mode}
          onSaveContent={setContent}
          setMetadata={setMetadata}
          status={artifact.status}
          title={artifact.title}
        />
      </ChatArtifactBody>

      <ChatArtifactFooter visible={!isLatest}>
        <VersionFooter
          currentVersionIndex={currentIndex}
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
