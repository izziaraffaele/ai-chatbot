"use client";

import {
  ArrowLeft,
  ChevronRight,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownViewer } from "@/components/artifacts/markdown-viewer";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
} from "@/components/chat/artifact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

/**
 * File system item from the API
 */
export type FondazioneFsItem = {
  name: string;
  type: "file" | "folder";
  path: string;
  extension?: string;
};

/**
 * Payload structure for the widget content
 */
export type FondazioneBrowserPayload = {
  path: string;
  items: FondazioneFsItem[];
};

/**
 * View modes for the browser
 */
type ViewMode = "root" | "explorer" | "markdown";

/**
 * State for the selected markdown file
 */
type SelectedMarkdownFile = {
  path: string;
  name: string;
  content: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const FONDAZIONE_BROWSER_KIND = "fondazione-browser" as const;

export type FondazioneBrowserArtifactKind = typeof FONDAZIONE_BROWSER_KIND;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a folder name for display (capitalize, replace underscores)
 */
function formatFolderName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get parent path from current path
 */
function getParentPath(currentPath: string): string {
  if (!currentPath || currentPath === "") {
    return "";
  }
  const lastSlash = currentPath.lastIndexOf("/");
  if (lastSlash === -1) {
    return "";
  }
  return currentPath.slice(0, lastSlash);
}

/**
 * Get file icon based on extension
 */
function getFileIcon(extension?: string) {
  switch (extension?.toLowerCase()) {
    case ".md":
      return FileText;
    case ".csv":
      return FileSpreadsheet;
    default:
      return File;
  }
}

/**
 * Check if a file type is supported for viewing
 */
function isSupportedFileType(extension?: string): boolean {
  const supported = [".md", ".csv"];
  return supported.includes(extension?.toLowerCase() || "");
}

// ============================================================================
// COMPONENTS
// ============================================================================

export type FondazioneBrowserArtifactProps = {
  className?: string;
};

/**
 * FondazioneBrowserArtifact
 * Visual file browser for Fondazione CON IL SUD bandi files.
 * Displays a grid of folders at root level, and a list-based explorer for subfolders.
 */
export function FondazioneBrowserArtifact({
  className,
}: FondazioneBrowserArtifactProps) {
  const { activeTab, closeTab, openTab } = useCanvasTabs();

  // State
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<FondazioneFsItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("root");
  const [selectedMarkdownFile, setSelectedMarkdownFile] =
    useState<SelectedMarkdownFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get initial content from the tab artifact (if available)
  const initialContent = useMemo(() => {
    const content = activeTab?.artifact.content;
    if (
      content &&
      typeof content === "object" &&
      "items" in (content as object)
    ) {
      return content as FondazioneBrowserPayload;
    }
    return null;
  }, [activeTab?.artifact.content]);

  // Initialize from tab content or fetch root
  useEffect(() => {
    if (initialContent && initialContent.items.length > 0) {
      setCurrentPath(initialContent.path);
      setItems(initialContent.items);
      setViewMode(initialContent.path === "" ? "root" : "explorer");
    } else {
      // Fetch root directory
      fetchDirectory("");
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch directory contents from API
  const fetchDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/fondazione/fs?action=list&path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore nel caricamento");
      }

      const data = await response.json();
      setItems(data.items);
      setCurrentPath(path);
      setViewMode(path === "" ? "root" : "explorer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch file content from API
  const fetchFileContent = useCallback(async (path: string): Promise<string> => {
    const response = await fetch(
      `/api/fondazione/fs?action=read&path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Errore nella lettura del file");
    }

    const data = await response.json();
    return data.content;
  }, []);

  // Handle folder click
  const handleFolderClick = useCallback(
    (item: FondazioneFsItem) => {
      fetchDirectory(item.path);
    },
    [fetchDirectory]
  );

  // Handle file click
  const handleFileClick = useCallback(
    async (item: FondazioneFsItem) => {
      if (!isSupportedFileType(item.extension)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const content = await fetchFileContent(item.path);

        if (item.extension?.toLowerCase() === ".md") {
          // Show markdown in-place
          setSelectedMarkdownFile({
            path: item.path,
            name: item.name,
            content,
          });
          setViewMode("markdown");
        } else if (item.extension?.toLowerCase() === ".csv") {
          // Open CSV in a new sheet tab
          openTab(
            {
              documentId: `csv:${item.path}`,
              kind: "sheet",
              content,
              title: item.name,
              isVisible: true,
              status: "idle",
              boundingBox: { top: 0, left: 0, width: 0, height: 0 },
            },
            item.name
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nella lettura");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFileContent, openTab]
  );

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (viewMode === "markdown") {
      // Return to explorer view at the same path
      setViewMode(currentPath === "" ? "root" : "explorer");
      setSelectedMarkdownFile(null);
    } else if (currentPath !== "") {
      // Navigate to parent directory
      const parentPath = getParentPath(currentPath);
      fetchDirectory(parentPath);
    }
  }, [viewMode, currentPath, fetchDirectory]);

  // Handle home navigation
  const handleHome = useCallback(() => {
    setSelectedMarkdownFile(null);
    fetchDirectory("");
  }, [fetchDirectory]);

  // Handle close
  const handleClose = useCallback(() => {
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [activeTab, closeTab]);

  // Calculate stats
  const stats = useMemo(() => {
    const folders = items.filter((i) => i.type === "folder").length;
    const files = items.filter((i) => i.type === "file").length;
    return { folders, files, total: items.length };
  }, [items]);

  // Render markdown view using the rich MarkdownViewer component
  if (viewMode === "markdown" && selectedMarkdownFile) {
    return (
      <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
        <ChatArtifactHeader
          actions={
            <div className="flex items-center gap-2">
              <Badge
                className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                variant="outline"
              >
                <FileText className="mr-1 size-3" />
                Markdown
              </Badge>
            </div>
          }
          onClose={handleClose}
          subtitle={selectedMarkdownFile.path}
          title={selectedMarkdownFile.name}
        />

        <ChatArtifactBody>
          <div className="flex h-full flex-col">
            {/* Navigation */}
            <div className="flex items-center gap-2 border-border border-b bg-white px-4 py-2">
              <Button
                className="gap-2"
                onClick={handleBack}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                Indietro
              </Button>
              <Button
                className="gap-2"
                onClick={handleHome}
                size="sm"
                variant="ghost"
              >
                <Home className="size-4" />
                Home
              </Button>
            </div>

            {/* Rich Markdown Viewer */}
            <div className="flex-1 overflow-hidden">
              <MarkdownViewer
                content={selectedMarkdownFile.content}
                description={selectedMarkdownFile.path}
                title={selectedMarkdownFile.name}
              />
            </div>
          </div>
        </ChatArtifactBody>
      </ChatArtifact>
    );
  }

  // Render root or explorer view
  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <Folder className="size-4" />
              <span className="font-medium">{stats.folders} cartelle</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <File className="size-4" />
              <span className="font-medium">{stats.files} file</span>
            </div>
          </div>
        }
        onClose={handleClose}
        subtitle={currentPath || "Cartella principale"}
        title={activeTab?.title || "Esplora Bandi"}
      />

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Navigation bar (only show when not at root) */}
          {currentPath !== "" && (
            <div className="flex items-center gap-2 border-border border-b px-4 py-2">
              <Button
                className="gap-2"
                onClick={handleBack}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                Indietro
              </Button>
              <Button
                className="gap-2"
                onClick={handleHome}
                size="sm"
                variant="ghost"
              >
                <Home className="size-4" />
                Home
              </Button>
              <div className="ml-2 flex items-center gap-1 text-muted-foreground text-sm">
                <ChevronRight className="size-3" />
                <span className="font-medium">{currentPath}</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span>Caricamento...</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Content */}
          {!isLoading && !error && (
            <>
              {viewMode === "root" ? (
                <RootGridView
                  items={items}
                  onFolderClick={handleFolderClick}
                />
              ) : (
                <ExplorerListView
                  items={items}
                  onFileClick={handleFileClick}
                  onFolderClick={handleFolderClick}
                />
              )}
            </>
          )}

          {/* Empty state */}
          {!isLoading && !error && items.length === 0 && (
            <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
              Nessun elemento in questa cartella
            </div>
          )}
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Root view - Grid of folder cards
 */
function RootGridView({
  items,
  onFolderClick,
}: {
  items: FondazioneFsItem[];
  onFolderClick: (item: FondazioneFsItem) => void;
}) {
  const folders = items.filter((i) => i.type === "folder");

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <button
            className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md dark:hover:border-orange-700 dark:hover:bg-orange-950/20"
            key={folder.path}
            onClick={() => onFolderClick(folder)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-orange-50 text-orange-500 transition-colors group-hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:group-hover:bg-orange-900">
                <FolderOpen className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">
                  {formatFolderName(folder.name)}
                </h3>
                <p className="truncate text-muted-foreground text-xs">
                  {folder.name}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge
                className="bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                variant="outline"
              >
                Cartella
              </Badge>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Explorer view - List of folders and files
 */
function ExplorerListView({
  items,
  onFolderClick,
  onFileClick,
}: {
  items: FondazioneFsItem[];
  onFolderClick: (item: FondazioneFsItem) => void;
  onFileClick: (item: FondazioneFsItem) => void;
}) {
  // Sort: folders first, then files
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "it");
    });
  }, [items]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {sortedItems.map((item) => {
          const isFolder = item.type === "folder";
          const isSupported = isFolder || isSupportedFileType(item.extension);
          const FileIcon = isFolder ? Folder : getFileIcon(item.extension);

          return (
            <button
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                isSupported
                  ? "hover:bg-accent/50"
                  : "cursor-not-allowed opacity-50"
              )}
              disabled={!isSupported}
              key={item.path}
              onClick={() =>
                isFolder ? onFolderClick(item) : onFileClick(item)
              }
              type="button"
            >
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  isFolder
                    ? "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400"
                    : item.extension === ".md"
                      ? "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
                      : item.extension === ".csv"
                        ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                )}
              >
                <FileIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{item.name}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {isFolder
                    ? "Cartella"
                    : item.extension?.toUpperCase().replace(".", "") || "File"}
                </p>
              </div>
              {isFolder && (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
              {!isSupported && (
                <Badge
                  className="text-xs"
                  variant="outline"
                >
                  Non supportato
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


