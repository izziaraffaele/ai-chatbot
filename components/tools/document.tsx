"use client";

import { getToolName } from "ai";
import equal from "fast-deep-equal";
import { memo, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { CodeEditor } from "@/components/code-editor";
import { InlineDocumentSkeleton } from "@/components/document-skeleton";
import {
  FileIcon,
  FullscreenIcon,
  LoaderIcon,
  MessageIcon,
  PencilEditIcon,
} from "@/components/icons";
import { Editor } from "@/components/text-editor";
import { useArtifact } from "@/hooks/use-artifact";
import { useChatDocument } from "@/hooks/use-chat-document";
import type { Document } from "@/lib/db/schema";
import type { ChatTools } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SpreadsheetEditor } from "../sheet-editor";
import type { ChatToolProps } from "./types";

type DocumentTools = Pick<
  ChatTools,
  "createDocument" | "updateDocument" | "requestSuggestions"
>;

export type DocumentToolProps = ChatToolProps<DocumentTools>;

const getToolError = (type: string, errorText?: string) => {
  const action = {
    createDocument: "creating document",
    updateDocument: "updating document",
    requestSuggestions: "requesting document suggestions",
  }[type];

  return `Error ${action}: ${errorText}`;
};

/**
 * Unified Document Tool UI Component
 * Handles both document creation and update tool invocations using custom document layout
 */
function PureDocumentTool(props: DocumentToolProps) {
  const { part, isReadonly = false, isLastPart, isStreaming } = props;
  const { artifact, setArtifact } = useArtifact();
  const hitboxRef = useRef<HTMLDivElement>(null);

  const documentId = part.output && "id" in part.output ? part.output.id : null;

  const documents = useChatDocument(documentId);
  const previewDocument = useMemo<Document>(
    () => documents.entries[0],
    [documents]
  );

  const isStreamingArtifact =
    ((isStreaming && isLastPart) || artifact.status === "streaming") &&
    documentId === artifact.documentId;

  // Handle click to open document in canvas
  const handleDocumentClick = useCallback(() => {
    if (isReadonly) {
      return;
    }

    const boundingBox = hitboxRef.current?.getBoundingClientRect();
    if (!boundingBox || !part.output) {
      return;
    }

    setArtifact((currentArtifact) =>
      "id" in part.output
        ? {
            documentId: part.output.id,
            kind: part.output.kind,
            content: currentArtifact.content,
            title: part.output.title,
            isVisible: true,
            status: "idle",
            boundingBox: {
              top: boundingBox.top,
              left: boundingBox.left,
              width: boundingBox.width,
              height: boundingBox.height,
            },
          }
        : currentArtifact
    );
  }, [part.output, isReadonly, setArtifact]);

  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        {getToolError(getToolName(part), String(part.output.error))}
      </div>
    );
  }

  if (artifact.isVisible) {
    const Comp = part.output ? DocumentToolResult : DocumentToolCall;
    return <Comp {...props} isStreaming={isStreamingArtifact} />;
  }

  // Loading state
  if (documents.isLoading || isStreamingArtifact) {
    return <LoadingDocumentSkeleton />;
  }

  // Determine document to display
  const document: Document =
    previewDocument ||
    (artifact.status === "streaming"
      ? {
          title: artifact.title,
          kind: artifact.kind,
          content: artifact.content,
          id: artifact.documentId,
          createdAt: new Date(),
          userId: "noop",
        }
      : null);

  if (!document) {
    return <LoadingDocumentSkeleton />;
  }

  return (
    <div className="relative w-full cursor-pointer">
      <DocumentToolHitboxLayer
        hitboxRef={hitboxRef as React.RefObject<HTMLDivElement>}
        isReadonly={isReadonly}
        onDocumentClick={handleDocumentClick}
      />

      <DocumentToolHeader
        isReadonly={isReadonly}
        isStreaming={isStreaming}
        title={document.title}
      />

      <DocumentContent document={document} />
    </div>
  );
}

/**
 * Custom document header with specific styling for document tools
 */
const DocumentToolHeader = ({
  title,
  isStreaming,
  isReadonly,
}: {
  title: string;
  isStreaming: boolean;
  isReadonly: boolean;
}) => (
  <div className="flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700 dark:bg-muted">
    <div className="flex flex-row items-start gap-3 sm:items-center">
      <div className="text-muted-foreground">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="-translate-y-1 font-medium sm:translate-y-0">{title}</div>
    </div>
    {!isReadonly && (
      <div className="w-8">
        <FullscreenIcon />
      </div>
    )}
  </div>
);

/**
 * Click overlay layer for document interaction
 */
const DocumentToolHitboxLayer = memo(
  ({
    hitboxRef,
    isReadonly,
    onDocumentClick,
  }: {
    hitboxRef: React.RefObject<HTMLDivElement>;
    isReadonly: boolean;
    onDocumentClick: () => void;
  }) => {
    if (isReadonly) {
      return null;
    }

    return (
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 z-10 size-full cursor-pointer rounded-xl"
        onClick={onDocumentClick}
        ref={hitboxRef}
        role="presentation"
      >
        <div className="flex w-full items-center justify-end p-4">
          <div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <FullscreenIcon />
          </div>
        </div>
      </div>
    );
  }
);

/**
 * Loading skeleton with document-specific layout
 */
const LoadingDocumentSkeleton = () => (
  <div className="w-full">
    <div className="flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
      <div className="flex flex-row items-center gap-3">
        <div className="text-muted-foreground">
          <div className="size-4 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-lg bg-muted-foreground/20" />
      </div>
      <div>
        <FullscreenIcon />
      </div>
    </div>
    <div className="overflow-y-scroll rounded-b-2xl border border-t-0 bg-muted p-8 pt-4 dark:border-zinc-700">
      <InlineDocumentSkeleton />
    </div>
  </div>
);

export const DocumentTool = memo(PureDocumentTool, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

DocumentTool.displayName = "DocumentTool";

const DOCUMENT_TOOL_ICON_MAP = {
  createDocument: FileIcon,
  updateDocument: PencilEditIcon,
  requestSuggestions: MessageIcon,
};

/**
 * Document content renderer based on document kind
 */
const DocumentContent = ({ document }: { document: Document }) => {
  const content = document.content ?? "";
  // Common props for both editors
  const commonEditorProps = {
    content,
    isCurrentVersion: true,
    currentVersionIndex: 0,
    status: "idle" as const,
    onSaveContent: () => {
      return;
    }, // No-op for preview
    suggestions: [],
  };

  const renderEditor = () => {
    switch (document.kind) {
      case "text":
        return <Editor {...commonEditorProps} />;
      case "code":
        return <CodeEditor {...commonEditorProps} />;
      case "sheet":
        return <SpreadsheetEditor {...commonEditorProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "h-[257px] overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted",
        {
          "p-4 sm:px-14 sm:py-16": document.kind === "text",
          "p-0": document.kind === "code",
        }
      )}
    >
      {renderEditor()}
    </div>
  );
};

function DocumentToolResult({ part, isReadonly }: DocumentToolProps) {
  const { setArtifact } = useArtifact();

  const toolName = getToolName(part);
  const DocumentToolIcon = DOCUMENT_TOOL_ICON_MAP[toolName];

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isReadonly) {
      toast.error("Viewing files in shared chats is currently not supported.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const boundingBox = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    setArtifact((currentArtifact) => {
      if (!part.output || !("id" in part.output)) {
        return currentArtifact;
      }

      return {
        documentId: part.output.id,
        kind: part.output.kind,
        content: currentArtifact.content,
        title: part.output.title,
        isVisible: true,
        status: "idle",
        boundingBox,
      };
    });
  };

  return (
    <button
      className="flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border bg-background px-3 py-2"
      onClick={handleClick}
      type="button"
    >
      <div className="mt-1 text-muted-foreground">
        <DocumentToolIcon />
      </div>
      <div className="text-left">
        {part.output && "title" in part.output ? part.output.title : ""}
      </div>
    </button>
  );
}

function DocumentToolCall({ part, isReadonly }: DocumentToolProps) {
  const { setArtifact } = useArtifact();
  const toolName = getToolName(part);

  const DocumentToolIcon = DOCUMENT_TOOL_ICON_MAP[toolName];

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isReadonly) {
      toast.error("Viewing files in shared chats is currently not supported.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const boundingBox = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };

    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      isVisible: true,
      boundingBox,
    }));
  };

  return (
    <button
      className="cursor pointer flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2"
      onClick={handleClick}
      type="button"
    >
      <div className="flex flex-row items-start gap-3">
        <div className="mt-1 text-zinc-500">
          <DocumentToolIcon />
        </div>

        <div className="text-left">
          {part.input && "title" in part.input ? part.input.title : ""}
        </div>
      </div>

      <div className="mt-1 animate-spin">{<LoaderIcon />}</div>
    </button>
  );
}
