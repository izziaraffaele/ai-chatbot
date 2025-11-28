"use client";

import { getToolName } from "ai";
import equal from "fast-deep-equal";
import { ArrowRight, ChevronRight } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { FileIcon, LoaderIcon } from "@/components/icons";
import {
  activateTabForStreaming,
  bindPendingTabToDocument,
  clearDocumentClosedFlag,
  openPendingTab,
  useCanvasTabs,
  wasDocumentClosedByUser,
} from "@/hooks/use-canvas-tabs";
import { generatePendingDocumentId } from "@/lib/canvas";
import type { ChatTools } from "@/lib/types";
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
 *
 * Supports multiple document creation in sequence:
 * 1. Open pending tabs IMMEDIATELY when tool-call starts (before document ID is known)
 * 2. Each tool call is tracked independently via toolCallId
 * 3. Show a minimal placeholder widget in chat that links to the tab
 * 4. Delegate content rendering to the canvas tab
 * 5. For updates, always show widget and activate/stream to existing tab
 *
 * The pending tab pattern ensures that:
 * - Tabs open instantly without waiting for backend response
 * - Each createDocument call gets its own tab
 * - Content streams directly into the correct tab via useTabStreamSync
 */
function PureDocumentTool(props: DocumentToolProps) {
  const { part, isReadonly = false, isStreaming } = props;
  const { openTab, tabs, switchTab } = useCanvasTabs();
  const hitboxRef = useRef<HTMLDivElement>(null);

  // Track which pending tab we opened (by toolCallId)
  // This ensures each tool call gets its own pending tab
  const pendingTabOpenedRef = useRef<string | null>(null);

  // Track previous toolCallId to detect when we get a new tool call
  const prevToolCallIdRef = useRef<string | null>(null);

  // Extract tool call ID for pending tab creation
  const toolCallId = part.toolCallId;

  // Reset refs when toolCallId changes (new tool call)
  if (toolCallId !== prevToolCallIdRef.current) {
    prevToolCallIdRef.current = toolCallId;
    // Don't reset pendingTabOpenedRef here - let the effect handle it
    // This prevents issues with strict mode double-rendering
  }

  // Extract ID from tool output if available
  const documentId =
    part.output && "id" in part.output ? (part.output.id as string) : null;

  // For updateDocument, the document ID comes from input
  const updateDocumentId =
    part.input && "id" in part.input ? (part.input.id as string) : null;

  // Get tool name for conditional logic
  const toolName = getToolName(part);
  const isCreateDocument = toolName === "createDocument";
  const isUpdateDocument = toolName === "updateDocument";

  // Check if tool output is available (tool execution completed)
  const hasToolOutput = Boolean(part.output);

  // Find the pending tab we created (if any)
  const pendingDocId = toolCallId
    ? generatePendingDocumentId(toolCallId)
    : null;

  // Find any tab related to this document (pending or actual)
  const relatedTab = useMemo(() => {
    // First check for the actual document ID
    if (documentId) {
      const actualTab = tabs.find(
        (tab) => tab.artifact.documentId === documentId
      );
      if (actualTab) {
        return actualTab;
      }
    }
    // For updateDocument, check the input document ID
    if (updateDocumentId) {
      const updateTab = tabs.find(
        (tab) => tab.artifact.documentId === updateDocumentId
      );
      if (updateTab) {
        return updateTab;
      }
    }
    // Check for pending tab
    if (pendingDocId) {
      const pendingTab = tabs.find(
        (tab) => tab.artifact.documentId === pendingDocId
      );
      if (pendingTab) {
        return pendingTab;
      }
    }
    return null;
  }, [tabs, documentId, updateDocumentId, pendingDocId]);

  // Track whether we've already attempted to bind the pending tab to the real ID
  const pendingTabBoundRef = useRef<string | null>(null);

  // ============================================================================
  // EFFECT: Open pending tab IMMEDIATELY when tool-call starts
  // ============================================================================
  useEffect(() => {
    // Only trigger when we have a tool name but no output yet (tool is starting)
    if (!toolName || hasToolOutput || !toolCallId) {
      return;
    }

    // Skip if we already opened a pending tab for this tool call
    if (pendingTabOpenedRef.current === toolCallId) {
      return;
    }

    // Get initial metadata from tool input
    const initialKind =
      part.input && "kind" in part.input ? (part.input.kind as string) : "text";
    const initialTitle =
      part.input && "title" in part.input
        ? (part.input.title as string)
        : isUpdateDocument
          ? "Updating document..."
          : "Creating document...";

    if (isCreateDocument) {
      // For createDocument: Open a pending tab immediately
      pendingTabOpenedRef.current = toolCallId;
      openPendingTab(toolCallId, initialKind as any, initialTitle);
    } else if (isUpdateDocument && updateDocumentId) {
      // Skip if user explicitly closed this document
      if (wasDocumentClosedByUser(updateDocumentId)) {
        pendingTabOpenedRef.current = toolCallId;
        return;
      }

      // For updateDocument: Activate existing tab and set to streaming
      pendingTabOpenedRef.current = toolCallId;
      const activated = activateTabForStreaming(updateDocumentId);

      // If tab doesn't exist (was closed), open a new one with the document ID
      if (!activated) {
        openTab(
          {
            documentId: updateDocumentId,
            kind: initialKind as any,
            content: "",
            title: initialTitle,
            isVisible: true,
            status: "streaming",
            boundingBox: { top: 0, left: 0, width: 0, height: 0 },
          },
          initialTitle
        );
      }
    }
  }, [
    toolName,
    hasToolOutput,
    toolCallId,
    isCreateDocument,
    isUpdateDocument,
    updateDocumentId,
    part.input,
    openTab,
  ]);

  // ============================================================================
  // EFFECT: Fallback binding of pending tab to real document ID
  // This handles cases where the data-id stream event was processed before
  // the pending tab was created, or if the stream sync missed the event.
  // ============================================================================
  useEffect(() => {
    // Only for createDocument when we have the real document ID from output
    if (!isCreateDocument || !documentId || !toolCallId) {
      return;
    }

    // Skip if we've already bound this pending tab
    if (pendingTabBoundRef.current === documentId) {
      return;
    }

    const pendingId = generatePendingDocumentId(toolCallId);

    // Attempt to bind - this is idempotent (no-op if already bound or tab doesn't exist)
    const didBind = bindPendingTabToDocument(pendingId, documentId);

    if (didBind) {
      pendingTabBoundRef.current = documentId;
    }
  }, [isCreateDocument, documentId, toolCallId]);

  // ============================================================================
  // EFFECT 3: Fallback - create tab if tool completed before pending tab was bound
  // This handles fast-completing tools where by the time DocumentTool renders,
  // the tool output already exists, so EFFECT 1 doesn't run.
  // ============================================================================
  useEffect(() => {
    // Only for createDocument when we have the document ID from output
    if (!isCreateDocument || !documentId || !toolCallId) {
      return;
    }

    // Skip if we already have a tab for this document (either pending was bound, or tab exists)
    if (relatedTab?.artifact.documentId === documentId) {
      return;
    }

    // Skip if user explicitly closed this document
    if (wasDocumentClosedByUser(documentId)) {
      return;
    }

    // No tab exists for this document - create one directly with actual document ID
    const title =
      (part.output && "title" in part.output
        ? (part.output.title as string)
        : null) ||
      (part.input && "title" in part.input
        ? (part.input.title as string)
        : "Document");
    const kind =
      part.output && "kind" in part.output
        ? (part.output.kind as string)
        : part.input && "kind" in part.input
          ? (part.input.kind as string)
          : "text";

    openTab(
      {
        documentId,
        kind: kind as any,
        content: "",
        title,
        isVisible: true,
        status: "idle",
        boundingBox: { top: 0, left: 0, width: 0, height: 0 },
      },
      title
    );
  }, [
    isCreateDocument,
    documentId,
    toolCallId,
    relatedTab?.artifact.documentId,
    part.output,
    part.input,
    openTab,
  ]);

  // Handle click to focus the document tab
  const handleOpen = useCallback(() => {
    if (isReadonly) {
      toast.error("Viewing files in shared chats is currently not supported.");
      return;
    }

    // If we have a related tab, switch to it
    if (relatedTab) {
      switchTab(relatedTab.id);
      return;
    }

    // Fallback: try to open with available ID
    const targetId = documentId || updateDocumentId;
    if (!targetId) {
      return;
    }

    // User explicitly wants to open this document - clear the "closed" flag
    clearDocumentClosedFlag(targetId);

    const targetTitle =
      (part.output && "title" in part.output
        ? (part.output.title as string)
        : null) ||
      (part.input && "title" in part.input
        ? (part.input.title as string)
        : "Document");

    const targetKind =
      part.output && "kind" in part.output ? (part.output.kind as any) : "text";

    const boundingBox = hitboxRef.current?.getBoundingClientRect();

    openTab(
      {
        documentId: targetId,
        kind: targetKind,
        content: "",
        title: targetTitle,
        isVisible: true,
        status: isStreaming ? "streaming" : "idle",
        boundingBox: boundingBox
          ? {
              top: boundingBox.top,
              left: boundingBox.left,
              width: boundingBox.width,
              height: boundingBox.height,
            }
          : { top: 0, left: 0, width: 0, height: 0 },
      },
      targetTitle
    );
  }, [
    part.output,
    part.input,
    documentId,
    updateDocumentId,
    isReadonly,
    openTab,
    switchTab,
    isStreaming,
    relatedTab,
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        {getToolError(toolName, String(part.output.error))}
      </div>
    );
  }

  // Determine display title
  const displayTitle =
    (part.output && "title" in part.output
      ? (part.output.title as string)
      : null) ||
    (part.input && "title" in part.input
      ? (part.input.title as string)
      : isUpdateDocument
        ? "Updating document..."
        : "Creating document...");

  // Determine if we're currently streaming
  // Check both the tab status and the pending status
  const isTabStreaming = relatedTab?.artifact.status === "streaming";
  const isTabPending = relatedTab?.artifact.status === "pending";
  const isGenerating =
    isTabStreaming || isTabPending || (!hasToolOutput && isStreaming);

  return (
    <div className="w-full max-w-md" ref={hitboxRef}>
      <SimpleDocumentWidget
        isStreaming={isGenerating}
        isUpdate={isUpdateDocument}
        onClick={handleOpen}
        title={displayTitle}
      />
    </div>
  );
}

/**
 * Minimal placeholder widget for chat interface
 * Matches the style of "Documenti disponibili" widget
 */
function SimpleDocumentWidget({
  title,
  isStreaming,
  isUpdate = false,
  onClick,
}: {
  title: string;
  isStreaming: boolean;
  isUpdate?: boolean;
  onClick: () => void;
}) {
  const statusText = isStreaming
    ? isUpdate
      ? "Updating in canvas..."
      : "Generating content..."
    : isUpdate
      ? "Document updated"
      : "Click to view document";

  return (
    <button
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3 text-left shadow-sm transition-all hover:bg-muted/50"
      onClick={onClick}
      type="button"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {isStreaming ? (
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        ) : (
          <FileIcon />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-foreground text-sm">
          {title}
        </h3>
        <p className="truncate text-muted-foreground text-xs">{statusText}</p>
      </div>
      <div className="flex items-center gap-2">
        {isStreaming && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
        )}
        {isUpdate && isStreaming ? (
          <ArrowRight className="size-4 text-primary" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </div>
    </button>
  );
}

export const DocumentTool = memo(PureDocumentTool, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

DocumentTool.displayName = "DocumentTool";
