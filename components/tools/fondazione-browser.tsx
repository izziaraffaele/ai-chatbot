"use client";

import equal from "fast-deep-equal";
import { File, Folder, FolderOpen } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { FondazioneFsItem } from "@/components/artifacts/fondazione-browser";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import type { ChatToolProps } from "./types";

/**
 * Output type for the fondazioneBrowser tool
 */
type FondazioneBrowserOutput =
  | {
      action: "list";
      path: string;
      items: FondazioneFsItem[];
    }
  | {
      action: "read";
      path: string;
      extension: string | null;
      content: string;
    }
  | {
      action: "error";
      error: string;
    };

/**
 * FondazioneBrowserTool UI Component
 *
 * Renders the output of the fondazioneBrowser tool in the chat:
 * - When action="list": Shows a clickable widget that opens the browser panel
 * - When action="read": Shows file info (content is handled by the widget)
 * - When action="error": Shows error message
 */
function PureFondazioneBrowserTool({ part }: ChatToolProps) {
  const output = part.output as FondazioneBrowserOutput | undefined;
  const { openTab } = useCanvasTabs();
  const hitboxRef = useRef<HTMLDivElement>(null);

  // Track which output we've already auto-opened the panel for
  // Using a signature prevents re-opening on re-renders
  const autoOpenedForSignatureRef = useRef<string | null>(null);

  // Create a signature for the current output to track auto-open state
  const outputSignature = useMemo(() => {
    if (!output || output.action !== "list") {
      return null;
    }
    return `${output.path}:${output.items.length}`;
  }, [output]);

  // Calculate stats for the list view
  const stats = useMemo(() => {
    if (!output || output.action !== "list") {
      return null;
    }
    const folders = output.items.filter((i) => i.type === "folder").length;
    const files = output.items.filter((i) => i.type === "file").length;
    return { folders, files, total: output.items.length };
  }, [output]);

  // Handle click to open the panel
  const handleOpenPanel = useCallback(() => {
    if (!output || output.action !== "list") {
      return;
    }

    const boundingBox = hitboxRef.current?.getBoundingClientRect() ?? {
      top: window.innerHeight / 4,
      left: window.innerWidth / 2,
      width: 300,
      height: 200,
    };

    openTab(
      {
        documentId: "fondazione-browser",
        kind: "fondazione-browser",
        content: { path: output.path, items: output.items },
        title: "Esplora Bandi",
        isVisible: true,
        status: "idle",
        boundingBox: {
          top: boundingBox.top,
          left: boundingBox.left,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      },
      "Esplora Bandi"
    );
  }, [output, openTab]);

  // AUTO-OPEN: When list output is available, automatically open the browser panel
  useEffect(() => {
    // Only auto-open for list action
    if (!output || output.action !== "list" || !outputSignature) {
      return;
    }

    // Skip if already opened for this output
    if (autoOpenedForSignatureRef.current === outputSignature) {
      return;
    }

    // Mark as opened for this output
    autoOpenedForSignatureRef.current = outputSignature;

    // Open the panel
    openTab(
      {
        documentId: "fondazione-browser",
        kind: "fondazione-browser",
        content: { path: output.path, items: output.items },
        title: "Esplora Bandi",
        isVisible: true,
        status: "idle",
        boundingBox: {
          top: window.innerHeight / 4,
          left: window.innerWidth / 2,
          width: 300,
          height: 200,
        },
      },
      "Esplora Bandi"
    );
  }, [output, outputSignature, openTab]);

  // If no output yet (streaming), show loading
  if (!output) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground text-sm">
        Caricamento bandi in corso...
      </div>
    );
  }

  // If error occurred
  if (output.action === "error") {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {output.error}
      </div>
    );
  }

  // If read action - show file info (actual content shown in widget)
  if (output.action === "read") {
    const fileName = output.path.split("/").pop() || output.path;
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
          <File className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{fileName}</p>
          <p className="text-muted-foreground text-xs">
            File caricato ({output.extension || "file"})
          </p>
        </div>
      </div>
    );
  }

  // If list action - show clickable widget to open/reopen panel
  if (output.action === "list" && stats) {
    const pathLabel = output.path || "Cartella principale";

    return (
      <div ref={hitboxRef}>
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-all hover:bg-accent/50 hover:shadow-md"
          onClick={handleOpenPanel}
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400">
            <FolderOpen className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Esplora Bandi
            </h3>
            <p className="text-muted-foreground text-xs">
              {pathLabel} • Clicca per aprire il browser
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Folder className="size-3" />
              {stats.folders}
            </span>
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <File className="size-3" />
              {stats.files}
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Fallback - empty state
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
      Nessun contenuto disponibile
    </div>
  );
}

/**
 * Memoized FondazioneBrowserTool component to prevent unnecessary re-renders
 * during streaming updates. Uses deep equality for part comparison.
 */
export const FondazioneBrowserTool = memo(
  PureFondazioneBrowserTool,
  (prev, next) => {
    return equal(prev.part, next.part);
  }
);

