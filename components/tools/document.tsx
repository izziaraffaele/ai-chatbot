"use client";

import equal from "fast-deep-equal";
import { memo, useCallback, useMemo, useRef } from "react";
import { InlineDocumentSkeleton } from "@/components/document-skeleton";
import { FileIcon, FullscreenIcon, LoaderIcon } from "@/components/icons";
import { useArtifact } from "@/hooks/use-artifact";
import { useChatDocument } from "@/hooks/use-chat-document";
import type { Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { InferChatToolUIProps } from "./types";

// const getToolAction = (
//   type:
//     | "tool-createDocument"
//     | "tool-updateDocument"
//     | "tool-requestSuggestions",
//   title: string
// ) => {
//   const message = {
//     "tool-createDocument": `Created "${title}"`,
//     "tool-updateDocument": `Updated "${title}"`,
//     "tool-requestSuggestions": `Added suggestions to "${title}"`,
//   }[type];

//   return message;
// };

const getToolError = (
  type:
    | "tool-createDocument"
    | "tool-updateDocument"
    | "tool-requestSuggestions",
  errorText?: string
) => {
  const action = {
    "tool-createDocument": "creating",
    "tool-updateDocument": "updating",
    "tool-requestSuggestions": "requesting suggestions",
  }[type];

  return `Error ${action} document: ${errorText}`;
};

/**
 * Unified Document Tool UI Component
 * Handles both document creation and update tool invocations using custom document layout
 */
function PureDocumentTool({
  part,
  isReadonly = false,
}: InferChatToolUIProps<
  "tool-createDocument" | "tool-updateDocument" | "tool-requestSuggestions"
>) {
  const { artifact, setArtifact } = useArtifact();
  const hitboxRef = useRef<HTMLDivElement>(null);

  const result = part.output;
  const documents = useChatDocument(
    result && "id" in result ? result.id : null
  );

  const previewDocument = useMemo<Document>(
    () => documents.entries[0],
    [documents]
  );

  // Handle click to open document in canvas
  const handleDocumentClick = useCallback(() => {
    if (isReadonly) {
      return;
    }

    const boundingBox = hitboxRef.current?.getBoundingClientRect();
    if (!boundingBox || !result) {
      return;
    }

    setArtifact((currentArtifact) =>
      "id" in result
        ? {
            documentId: result.id,
            kind: result.kind,
            content: currentArtifact.content,
            title: result.title,
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
  }, [result, isReadonly, setArtifact]);

  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        {getToolError(part.type, String(part.output.error))}
      </div>
    );
  }

  // Loading state
  if (documents.isLoading) {
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

  const isStreaming = artifact.status === "streaming";

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

/**
 * Document content renderer based on document kind
 */
const DocumentContent = ({ document }: { document: Document }) => {
  const content = document.content ?? "";

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
      {document.kind === "text" ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        </div>
      ) : document.kind === "code" ? (
        <div className="relative flex w-full flex-1">
          <pre className="w-full overflow-x-auto bg-muted p-4 text-sm">
            <code>{content}</code>
          </pre>
        </div>
      ) : document.kind === "sheet" ? (
        <div className="relative flex size-full flex-1 p-4">
          <div className="w-full rounded border bg-muted p-4 text-center text-muted-foreground text-sm">
            Sheet Editor (Content: {content?.slice(0, 50)}...)
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Unknown document type: {document.kind}
        </div>
      )}
    </div>
  );
};

export const DocumentTool = memo(PureDocumentTool, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

DocumentTool.displayName = "DocumentTool";
