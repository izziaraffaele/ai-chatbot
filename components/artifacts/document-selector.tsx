"use client";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Database,
  DatabaseZap,
  Files,
  FileText,
  Folder,
  FolderSync,
  HardDrive,
  Hash,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Package,
  Receipt,
  Search,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
} from "@/components/chat/artifact";
import { useChatRuntime } from "@/components/chat/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { setSelectedInvoice } from "@/lib/canvas";
import { WIDGET_KINDS } from "@/lib/canvas/widget-registry";
import { cn } from "@/lib/utils";
import type {
  FileSystemFile,
  FileSystemFolder,
  FileSystemItem,
  FileSystemRoot,
  FolderErrorStatus,
} from "@/mastra/utils/knowledge-base-loader";

// ============================================================================
// TYPES
// ============================================================================

/**
 * File validation info - matches the type from load-invoice tool
 */
export type FileValidation = {
  fileId: string;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
};

/**
 * Invoice metadata from the knowledge base
 */
type InvoiceMetadata = {
  fileId: string;
  fileName: string;
  supplier?: string;
  supplierVatId?: string;
  buyer?: string;
  buyerVatId?: string;
  date?: string;
  invoiceNumber?: string;
  documentType?: string;
  totalAmount?: number;
  currency?: string;
};

/**
 * Invoice validation result
 */
type InvoiceValidationResult = {
  iban: string | null;
  cig: string | null;
  cup: string | null;
  codiceFornitore: string | null;
  importoSpesa: number | null;
  descrizioneSpesa: string | null;
  codicePA: string | null;
  codiceFiscale: string | null;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
};

/**
 * Full invoice data loaded from API
 */
type InvoiceData = {
  /** Canonical recordId for reloading the invoice */
  recordId?: string;
  metadata: InvoiceMetadata;
  content: string;
  validation: InvoiceValidationResult;
};

/**
 * View mode for the artifact
 */
type ViewMode = "list" | "detail" | "recent-invoices";

/**
 * Status of an extracted field for color coding
 */
type FieldStatus = "valid" | "invalid_format" | "missing";

// ============================================================================
// CONSTANTS
// ============================================================================

// Regex patterns extracted to top-level to avoid recreation on every render
const VAT_MATCH_REGEX = /IT\d+/;

export const DOCUMENT_SELECTOR_KIND = "document-selector" as const;

export type DocumentSelectorArtifactKind = typeof DOCUMENT_SELECTOR_KIND;

export const isDocumentSelectorArtifact = (
  kind: string
): kind is DocumentSelectorArtifactKind => kind === DOCUMENT_SELECTOR_KIND;

/**
 * Content type for document selector artifact
 * Can be either flat list (legacy) or hierarchical file system
 */
export type DocumentSelectorContent = FileValidation[] | FileSystemRoot;

export type DocumentSelectorUIArtifact = {
  title: string;
  documentId: string;
  kind: DocumentSelectorArtifactKind;
  content: DocumentSelectorContent;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

/**
 * Check if content is hierarchical file system
 */
function isFileSystemRoot(
  content: DocumentSelectorContent
): content is FileSystemRoot {
  return (
    content !== null &&
    typeof content === "object" &&
    "items" in content &&
    Array.isArray(content.items)
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDisplayName(fileId: string): string {
  const vatMatch = fileId.match(VAT_MATCH_REGEX);
  if (vatMatch) {
    return vatMatch[0];
  }
  const parts = fileId.split("_");
  if (parts.length > 1) {
    return parts.slice(0, 2).join("_");
  }
  return fileId.slice(0, 20);
}

/**
 * Mapping from UI field keys to the exact validation field name patterns.
 * Keys are the UI field identifiers, values are regex patterns that match
 * the human-readable Italian field names from campiMancanti/campiNonValidi.
 */
const FIELD_NAME_PATTERNS: Record<string, RegExp> = {
  iban: /^IBAN$/i,
  cig: /^CIG\b/i, // "CIG" or "CIG (Codice..."
  cup: /^CUP\b/i, // "CUP" or "CUP (Codice..."
  importo: /^Importo\s+Spesa$/i,
  descrizione: /^Descrizione\s+Spesa$/i,
  codicefornitore: /^Codice\s+Fornitore/i,
  codicefiscale: /^Codice\s+Fiscale/i,
  codicepa: /^Codice\s+Destinatario\s+PA$/i,
};

/**
 * Determines the status of a field based on validation data
 */
function getFieldStatus(
  fieldName: string,
  value: string | number | null | undefined,
  campiMancanti: string[],
  campiNonValidi: string[]
): FieldStatus {
  // Get the pattern for this field, or create a fallback exact-match pattern
  const pattern =
    FIELD_NAME_PATTERNS[fieldName.toLowerCase()] ??
    new RegExp(`^${fieldName}$`, "i");

  // Check if field is in missing fields list using pattern matching
  if (campiMancanti.some((f) => pattern.test(f))) {
    return "missing";
  }
  // Check if field is in invalid format list using pattern matching
  if (campiNonValidi.some((f) => pattern.test(f))) {
    return "invalid_format";
  }
  // If value exists and not in invalid lists, it's valid
  if (value !== null && value !== undefined && value !== "") {
    return "valid";
  }
  // Default to missing if no value
  return "missing";
}

/**
 * Get styles for field status
 */
function getFieldStatusStyles(status: FieldStatus) {
  switch (status) {
    case "valid":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/50",
        border: "border-emerald-200 dark:border-emerald-800",
        label: "text-emerald-700 dark:text-emerald-400",
        value: "text-emerald-900 dark:text-emerald-100",
      };
    case "invalid_format":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/50",
        border: "border-amber-200 dark:border-amber-800",
        label: "text-amber-700 dark:text-amber-400",
        value: "text-amber-900 dark:text-amber-100",
      };
    default:
      return {
        bg: "bg-red-50 dark:bg-red-950/50",
        border: "border-red-200 dark:border-red-800",
        label: "text-red-700 dark:text-red-400",
        value: "text-red-900 dark:text-red-100",
      };
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

export type DocumentSelectorArtifactProps = {
  className?: string;
};

/**
 * DocumentSelectorArtifact
 * Displays available documents in a side panel with search, filters, and validation status.
 * Supports both flat file list and hierarchical folder structure.
 * When a document is clicked, switches to a detail view showing extracted data and original invoice.
 */
export function DocumentSelectorArtifact({
  className,
}: DocumentSelectorArtifactProps) {
  const { chat } = useChatRuntime();
  const { activeTab, closeTab, openTabWithData } = useCanvasTabs();

  // View state
  const [panelViewMode, setPanelViewMode] = useState<ViewMode>("list");
  const [listViewMode, setListViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Folder navigation state (page-based navigation)
  const [currentFolder, setCurrentFolder] = useState<FileSystemFolder | null>(
    null
  );
  const [folderHistory, setFolderHistory] = useState<FileSystemFolder[]>([]);

  // Lazy loading state
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [lazyLoadedChildren, setLazyLoadedChildren] = useState<
    Record<string, FileSystemItem[]>
  >({});
  const [lazyLoadErrors, setLazyLoadErrors] = useState<Record<string, string>>(
    {}
  );

  // Selected document data
  const [selectedDocument, setSelectedDocument] = useState<InvoiceData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get content from active tab
  const content = activeTab?.artifact.content as
    | DocumentSelectorContent
    | undefined;

  // Determine if we have hierarchical content
  const isHierarchical = content ? isFileSystemRoot(content) : false;

  // Get files from active tab artifact content (supports both formats)
  const filesWithValidation = useMemo((): FileValidation[] => {
    if (!content) {
      return [];
    }

    // Hierarchical format - flatten for search/stats
    if (isFileSystemRoot(content)) {
      const flattenItems = (items: FileSystemItem[]): FileValidation[] => {
        const files: FileValidation[] = [];
        for (const item of items) {
          if (item.type === "file") {
            files.push({
              fileId: item.fileId,
              fatturaValida: item.fatturaValida,
              campiMancanti: item.campiMancanti,
              campiNonValidi: item.campiNonValidi,
            });
          } else if (item.type === "folder") {
            files.push(...flattenItems(item.children));
          }
        }
        return files;
      };
      return flattenItems(content.items);
    }

    // Legacy flat format
    if (Array.isArray(content)) {
      return content as FileValidation[];
    }

    return [];
  }, [content]);

  // Get file system items (for hierarchical view) with lazy loaded children merged
  const fileSystemItems = useMemo((): FileSystemItem[] => {
    if (!content || !isFileSystemRoot(content)) {
      return [];
    }

    // Recursively merge lazy loaded children into the tree
    const mergeChildren = (items: FileSystemItem[]): FileSystemItem[] => {
      return items.map((item) => {
        if (item.type !== "folder") {
          return item;
        }

        // Check if we have lazy loaded children for this folder
        const loadedChildren = lazyLoadedChildren[item.id];
        const error = lazyLoadErrors[item.id];
        const isFolderLoading = loadingFolders.has(item.id);

        const folder: FileSystemFolder = {
          ...item,
          children: loadedChildren
            ? mergeChildren(loadedChildren)
            : mergeChildren(item.children),
          errorMessage: error ?? item.errorMessage,
          // Update stats from loaded children
          fileCount: loadedChildren
            ? loadedChildren.filter((c) => c.type === "file").length +
              loadedChildren
                .filter((c) => c.type === "folder")
                .reduce((sum, f) => sum + (f as FileSystemFolder).fileCount, 0)
            : item.fileCount,
        };

        // Mark as loading if applicable
        if (isFolderLoading) {
          folder.description = "Caricamento...";
        }

        return folder;
      });
    };

    return mergeChildren(content.items);
  }, [content, lazyLoadedChildren, lazyLoadErrors, loadingFolders]);

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery) {
      return filesWithValidation;
    }
    const query = searchQuery.toLowerCase();
    return filesWithValidation.filter(
      (f) =>
        f.fileId.toLowerCase().includes(query) ||
        getDisplayName(f.fileId).toLowerCase().includes(query)
    );
  }, [filesWithValidation, searchQuery]);

  // Filter file system items by search query
  const filterFileSystemItems = useCallback(
    (items: FileSystemItem[], query: string): FileSystemItem[] => {
      if (!query) {
        return items;
      }

      const lowerQuery = query.toLowerCase();
      const filtered: FileSystemItem[] = [];

      for (const item of items) {
        if (item.type === "file") {
          if (
            item.name.toLowerCase().includes(lowerQuery) ||
            item.fileId.toLowerCase().includes(lowerQuery) ||
            item.displayName?.toLowerCase().includes(lowerQuery)
          ) {
            filtered.push(item);
          }
        } else if (item.type === "folder") {
          const filteredChildren = filterFileSystemItems(item.children, query);
          if (filteredChildren.length > 0) {
            filtered.push({
              ...item,
              children: filteredChildren,
            });
          }
        }
      }

      return filtered;
    },
    []
  );

  const filteredFileSystemItems = useMemo(() => {
    return filterFileSystemItems(fileSystemItems, searchQuery);
  }, [fileSystemItems, searchQuery, filterFileSystemItems]);

  // Get current items to display based on navigation state
  const currentItems = useMemo((): FileSystemItem[] => {
    if (!currentFolder) {
      // At root level - show all top-level items (filtered)
      return filteredFileSystemItems;
    }

    // Inside a folder - get its children (with lazy loaded children merged)
    const loadedChildren = lazyLoadedChildren[currentFolder.id];
    const children = loadedChildren ?? currentFolder.children;

    // Filter the children by search query
    return filterFileSystemItems(children, searchQuery);
  }, [
    currentFolder,
    filteredFileSystemItems,
    lazyLoadedChildren,
    searchQuery,
    filterFileSystemItems,
  ]);

  // Separate folders and files from current items
  const currentFolders = useMemo(
    () =>
      currentItems.filter(
        (item) => item.type === "folder"
      ) as FileSystemFolder[],
    [currentItems]
  );
  const currentFiles = useMemo(
    () =>
      currentItems.filter((item) => item.type === "file") as FileSystemFile[],
    [currentItems]
  );

  // Calculate stats
  const validCount = useMemo(
    () => filesWithValidation.filter((f) => f.fatturaValida).length,
    [filesWithValidation]
  );
  const invalidCount = filesWithValidation.length - validCount;

  // Fetch lazy folder contents from API
  const fetchLazyFolderContents = useCallback(
    async (folder: FileSystemFolder) => {
      if (!folder.lazy || folder.lazyPath === undefined) {
        return;
      }

      const folderId = folder.id;
      const lazyPath = folder.lazyPath ?? "";

      // Already loading or loaded
      if (loadingFolders.has(folderId) || lazyLoadedChildren[folderId]) {
        return;
      }

      setLoadingFolders((prev) => new Set(prev).add(folderId));
      setLazyLoadErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[folderId];
        return newErrors;
      });

      try {
        const response = await fetch(
          `/api/smb?action=browse&path=${encodeURIComponent(lazyPath)}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error ?? "Failed to load folder");
        }

        // Convert API entries to FileSystemItem[]
        const children: FileSystemItem[] = data.entries.map(
          (entry: {
            name: string;
            path: string;
            type: "file" | "folder";
            itemCount?: number;
            displayName?: string;
          }) => {
            if (entry.type === "folder") {
              return {
                id: `sibac-shared:folder:${entry.path}`,
                name: entry.name,
                type: "folder" as const,
                children: [],
                fileCount: entry.itemCount ?? 0,
                validCount: 0,
                invalidCount: 0,
                defaultExpanded: false,
                icon: "folder",
                lazy: true,
                lazyPath: entry.path,
              } satisfies FileSystemFolder;
            }
            return {
              id: `sibac-shared:${entry.path}`,
              name: entry.displayName ?? entry.name,
              type: "file" as const,
              fileId: `sibac-shared:${entry.path}`,
              displayName: entry.displayName ?? entry.name,
              fatturaValida: false, // Will be validated on demand
              campiMancanti: [],
              campiNonValidi: [],
              source: "sibac-shared" as const,
            } satisfies FileSystemFile;
          }
        );

        setLazyLoadedChildren((prev) => ({
          ...prev,
          [folderId]: children,
        }));
      } catch (error) {
        console.error(
          `[DocumentSelector] Error loading folder ${folderId}:`,
          error
        );
        setLazyLoadErrors((prev) => ({
          ...prev,
          [folderId]: String(error),
        }));
      } finally {
        setLoadingFolders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderId);
          return newSet;
        });
      }
    },
    [loadingFolders, lazyLoadedChildren]
  );

  // Navigate into a folder (page-based navigation)
  const handleFolderClick = useCallback(
    (folder: FileSystemFolder) => {
      // Save current folder to history (if not null)
      setFolderHistory((prev) =>
        currentFolder ? [...prev, currentFolder] : prev
      );
      setCurrentFolder(folder);

      // Trigger lazy load if needed
      if (folder.lazy && !lazyLoadedChildren[folder.id]) {
        fetchLazyFolderContents(folder);
      }
    },
    [currentFolder, lazyLoadedChildren, fetchLazyFolderContents]
  );

  // Navigate back to parent folder
  const handleBackNavigation = useCallback(() => {
    const newHistory = [...folderHistory];
    const parentFolder = newHistory.pop() ?? null;
    setFolderHistory(newHistory);
    setCurrentFolder(parentFolder);
  }, [folderHistory]);

  // Handle close - closes the current tab
  const handleClose = useCallback(() => {
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [activeTab, closeTab]);

  // Handle document selection - loads invoice data first, then switches to detail view and sends chat message
  const handleDocumentSelect = useCallback(
    async (fileId: string) => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // Fetch invoice data first to ensure it's available before committing to UI changes
        const response = await fetch(
          `/api/invoice?fileId=${encodeURIComponent(fileId)}`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.message || "Errore nel caricamento del documento"
          );
        }

        const data = await response.json();

        // Only proceed with UI updates and chat message if fetch succeeded
        setSelectedDocument(data);
        setPanelViewMode("detail");

        // Store the selected invoice recordId for deterministic document generation
        // This is used by the chat transport to include invoiceContext in requests
        if (data.recordId) {
          setSelectedInvoice(data.recordId);
        }

        // Send message to chat so the AI can analyze the document
        // This triggers the loadInvoice tool and shows the "Analizza Fattura" button for invalid invoices
        chat.sendMessage({
          role: "user",
          parts: [{ type: "text", text: `Carica il documento ${fileId}` }],
        });
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Errore sconosciuto"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [chat]
  );

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setPanelViewMode("list");
    setSelectedDocument(null);
    setLoadError(null);
  }, []);

  // Handle open Views Explorer
  const handleOpenViewsExplorer = useCallback(() => {
    openTabWithData({
      kind: WIDGET_KINDS.SIBAC_VIEWS_EXPLORER,
      documentId: `sibac-views-${Date.now()}`,
      title: "Viste SIBAC",
      content: null,
      status: "idle",
    });
  }, [openTabWithData]);

  // Handle open Recent Invoices view
  const handleOpenRecentInvoices = useCallback(() => {
    setPanelViewMode("recent-invoices");
  }, []);

  // Handle back from Recent Invoices view
  const handleBackFromRecentInvoices = useCallback(() => {
    setPanelViewMode("list");
  }, []);

  // Render based on view mode
  if (panelViewMode === "detail" && selectedDocument) {
    return (
      <InvoiceDetailView
        className={className}
        invoiceData={selectedDocument}
        onBack={handleBackToList}
        onClose={handleClose}
      />
    );
  }

  // Render Recent Invoices view
  if (panelViewMode === "recent-invoices") {
    return (
      <RecentInvoicesView
        className={className}
        onBack={handleBackFromRecentInvoices}
        onClose={handleClose}
        onDocumentSelect={handleDocumentSelect}
      />
    );
  }

  // Check if we're loading the current folder
  const isCurrentFolderLoading = currentFolder
    ? loadingFolders.has(currentFolder.id)
    : false;

  // Get error for current folder
  const currentFolderError = currentFolder
    ? lazyLoadErrors[currentFolder.id]
    : null;

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span className="font-medium">{validCount} valide</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle className="size-4" />
              <span className="font-medium">{invalidCount} non valide</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Files className="size-4" />
              <span className="font-medium">
                {filesWithValidation.length} totali
              </span>
            </div>
          </div>
        }
        onClose={handleClose}
        subtitle="Seleziona un documento per visualizzarlo"
        title={activeTab?.title || "Documenti Disponibili"}
      />

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Back Navigation Header (when inside a folder) */}
          {currentFolder && (
            <div className="flex items-center gap-3 border-border border-b bg-muted/30 px-4 py-2">
              <Button
                className="gap-2"
                onClick={handleBackNavigation}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                Indietro
              </Button>
              <span className="font-medium text-sm">{currentFolder.name}</span>
              <Badge className="ml-auto text-xs" variant="secondary">
                {currentFolder.fileCount} elementi
              </Badge>
            </div>
          )}

          {/* Search and View Toggle */}
          <div className="flex flex-col gap-3 border-border border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca documenti..."
                value={searchQuery}
              />
            </div>

            {/* View Toggle */}
            <div className="flex rounded-md border border-input">
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-l-md transition-colors",
                  listViewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setListViewMode("grid")}
                title="Vista griglia"
                type="button"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-r-md border-input border-l transition-colors",
                  listViewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setListViewMode("list")}
                title="Vista lista"
                type="button"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {(isLoading || isCurrentFolderLoading) && (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <output>
                  {isCurrentFolderLoading
                    ? "Caricamento contenuti cartella..."
                    : "Caricamento documento..."}
                </output>
              </div>
            </div>
          )}

          {/* Error State */}
          {(loadError || currentFolderError) && (
            <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {loadError || currentFolderError}
            </div>
          )}

          {/* Document Grid/List */}
          {!isLoading && !isCurrentFolderLoading && (
            <div className="flex-1 overflow-y-auto p-4">
              {/* Card-based Grid View */}
              {isHierarchical && listViewMode === "grid" && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {/* Views Explorer card at root level */}
                  {!currentFolder && (
                    <ViewsExplorerCard onClick={handleOpenViewsExplorer} />
                  )}
                  {/* Recent Invoices card at root level */}
                  {!currentFolder && (
                    <RecentInvoicesCard onClick={handleOpenRecentInvoices} />
                  )}
                  {/* Render folder cards */}
                  {currentFolders.map((folder) => (
                    <FolderCard
                      folder={folder}
                      isLoading={loadingFolders.has(folder.id)}
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                    />
                  ))}
                  {/* Render file cards */}
                  {currentFiles.map((file) => (
                    <FileCard
                      file={file}
                      key={file.id}
                      onClick={() => handleDocumentSelect(file.fileId)}
                    />
                  ))}
                </div>
              )}

              {/* Card-based List View */}
              {isHierarchical && listViewMode === "list" && (
                <div className="flex flex-col gap-2">
                  {/* Views Explorer item at root level */}
                  {!currentFolder && (
                    <ViewsExplorerListItem onClick={handleOpenViewsExplorer} />
                  )}
                  {/* Recent Invoices item at root level */}
                  {!currentFolder && (
                    <RecentInvoicesListItem onClick={handleOpenRecentInvoices} />
                  )}
                  {/* Render folder items */}
                  {currentFolders.map((folder) => (
                    <FolderListItem
                      folder={folder}
                      isLoading={loadingFolders.has(folder.id)}
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                    />
                  ))}
                  {/* Render file items */}
                  {currentFiles.map((file) => (
                    <FileListItem
                      file={file}
                      key={file.id}
                      onClick={() => handleDocumentSelect(file.fileId)}
                    />
                  ))}
                </div>
              )}

              {/* Flat View (Legacy) */}
              {!isHierarchical && (
                <div
                  className={cn(
                    listViewMode === "grid"
                      ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                      : "flex flex-col gap-2"
                  )}
                >
                  {filteredFiles.map((file) => {
                    const displayName = getDisplayName(file.fileId);
                    const isValid = file.fatturaValida;

                    if (listViewMode === "list") {
                      return (
                        <button
                          className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-accent/50 hover:shadow-sm"
                          key={file.fileId}
                          onClick={() => handleDocumentSelect(file.fileId)}
                          type="button"
                        >
                          <div
                            className={cn(
                              "flex size-10 items-center justify-center rounded-lg",
                              isValid
                                ? "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
                                : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
                            )}
                          >
                            <FileText className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {displayName}
                            </p>
                          </div>
                          <ValidationBadge isValid={isValid} />
                        </button>
                      );
                    }

                    return (
                      <FileCard
                        file={{
                          id: file.fileId,
                          name: displayName,
                          type: "file",
                          fileId: file.fileId,
                          fatturaValida: file.fatturaValida,
                          campiMancanti: file.campiMancanti,
                          campiNonValidi: file.campiNonValidi,
                          source: "local",
                        }}
                        key={file.fileId}
                        onClick={() => handleDocumentSelect(file.fileId)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {currentItems.length === 0 && !currentFolderError && (
                <EmptyFolderMessage
                  currentFolder={currentFolder}
                  searchQuery={searchQuery}
                />
              )}
            </div>
          )}
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

// ============================================================================
// FOLDER CARD (Squared Card for Grid View)
// ============================================================================

type FolderCardProps = {
  folder: FileSystemFolder;
  onClick: () => void;
  isLoading?: boolean;
};

function FolderCard({ folder, onClick, isLoading }: FolderCardProps) {
  const FolderIcon = getFolderIcon(folder);
  const colorClasses = getFolderColorClasses(folder);

  return (
    <button
      className={cn(
        "group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all",
        "hover:border-primary/50 hover:bg-accent/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Folder Icon */}
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
          colorClasses.bg
        )}
      >
        {isLoading ? (
          <Loader2 className={cn("size-6 animate-spin", colorClasses.icon)} />
        ) : (
          <FolderIcon className={cn("size-6", colorClasses.icon)} />
        )}
      </div>

      {/* Folder Name */}
      <p className="line-clamp-2 w-full font-medium text-xs leading-tight">
        {folder.name}
      </p>

      {/* File Count */}
      <Badge className="text-[10px]" variant="secondary">
        {folder.fileCount} file
      </Badge>
    </button>
  );
}

// ============================================================================
// FOLDER LIST ITEM (Horizontal item for List View)
// ============================================================================

type FolderListItemProps = {
  folder: FileSystemFolder;
  onClick: () => void;
  isLoading?: boolean;
};

function FolderListItem({ folder, onClick, isLoading }: FolderListItemProps) {
  const FolderIcon = getFolderIcon(folder);
  const colorClasses = getFolderColorClasses(folder);

  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all",
        "hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Folder Icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          colorClasses.bg
        )}
      >
        {isLoading ? (
          <Loader2 className={cn("size-5 animate-spin", colorClasses.icon)} />
        ) : (
          <FolderIcon className={cn("size-5", colorClasses.icon)} />
        )}
      </div>

      {/* Folder Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{folder.name}</p>
        {folder.description && (
          <p className="truncate text-muted-foreground text-xs">
            {folder.description}
          </p>
        )}
      </div>

      {/* File Count Badge */}
      <Badge className="text-xs" variant="secondary">
        {folder.fileCount} file
      </Badge>
    </button>
  );
}

// ============================================================================
// VIEWS EXPLORER CARD (Entry point to SIBAC Views Explorer)
// ============================================================================

type ViewsExplorerCardProps = {
  onClick: () => void;
};

function ViewsExplorerCard({ onClick }: ViewsExplorerCardProps) {
  return (
    <button
      className={cn(
        "group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all",
        "hover:border-purple-500/50 hover:bg-purple-50/50 hover:shadow-md dark:hover:bg-purple-950/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Icon */}
      <div className="flex size-12 items-center justify-center rounded-xl bg-purple-100 transition-transform group-hover:scale-110 dark:bg-purple-950">
        <Database className="size-6 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Label */}
      <p className="line-clamp-2 w-full font-medium text-xs leading-tight">
        Esplora Viste SIBAC
      </p>

      {/* Badge */}
      <Badge className="border-purple-200 bg-purple-50 text-purple-700 text-[10px] dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300" variant="outline">
        SIB_V_IMPEGNI_X_CIG
      </Badge>
    </button>
  );
}

function ViewsExplorerListItem({ onClick }: ViewsExplorerCardProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all",
        "hover:border-purple-500/50 hover:bg-purple-50/50 hover:shadow-sm dark:hover:bg-purple-950/20"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
        <Database className="size-5 text-purple-600 dark:text-purple-400" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">Esplora Viste SIBAC</p>
        <p className="truncate text-muted-foreground text-xs">
          Visualizza i dati delle viste Oracle
        </p>
      </div>

      {/* Badge */}
      <Badge className="border-purple-200 bg-purple-50 text-purple-700 text-xs dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300" variant="outline">
        Oracle
      </Badge>
    </button>
  );
}

// ============================================================================
// RECENT INVOICES CARD (Entry point to Fatture Recenti view)
// ============================================================================

type RecentInvoicesCardProps = {
  onClick: () => void;
};

function RecentInvoicesCard({ onClick }: RecentInvoicesCardProps) {
  return (
    <button
      className={cn(
        "group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all",
        "hover:border-amber-500/50 hover:bg-amber-50/50 hover:shadow-md dark:hover:bg-amber-950/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Icon */}
      <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 transition-transform group-hover:scale-110 dark:bg-amber-950">
        <CalendarDays className="size-6 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Label */}
      <p className="line-clamp-2 w-full font-medium text-xs leading-tight">
        Fatture recenti
      </p>

      {/* Badge */}
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" variant="outline">
        2026
      </Badge>
    </button>
  );
}

function RecentInvoicesListItem({ onClick }: RecentInvoicesCardProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all",
        "hover:border-amber-500/50 hover:bg-amber-50/50 hover:shadow-sm dark:hover:bg-amber-950/20"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
        <CalendarDays className="size-5 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">Fatture recenti</p>
        <p className="truncate text-muted-foreground text-xs">
          Fatture elettroniche 2026
        </p>
      </div>

      {/* Badge */}
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-xs dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" variant="outline">
        XMLP
      </Badge>
    </button>
  );
}

// ============================================================================
// RECENT INVOICES VIEW (Table-based file browser for 2026)
// ============================================================================

/** Regex for matching two-digit folder names (months 01-12, days 01-31) */
const TWO_DIGIT_FOLDER_REGEX = /^\d{2}$/;

/** Month names in Italian */
const MONTH_NAMES: Record<string, string> = {
  "01": "Gennaio",
  "02": "Febbraio",
  "03": "Marzo",
  "04": "Aprile",
  "05": "Maggio",
  "06": "Giugno",
  "07": "Luglio",
  "08": "Agosto",
  "09": "Settembre",
  "10": "Ottobre",
  "11": "Novembre",
  "12": "Dicembre",
};

/** Short month names in Italian */
const MONTH_NAMES_SHORT: Record<string, string> = {
  "01": "Gen",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "Mag",
  "06": "Giu",
  "07": "Lug",
  "08": "Ago",
  "09": "Set",
  "10": "Ott",
  "11": "Nov",
  "12": "Dic",
};

/** Base path for XMLP invoices */
const XMLP_BASE_PATH = "Faenza/repositoryFE/XMLP";

/** Year to display */
const XMLP_YEAR = "2026";

type RecentInvoicesViewProps = {
  className?: string;
  onBack: () => void;
  onClose: () => void;
  onDocumentSelect: (fileId: string) => void;
};

/** Invoice file with date info */
type InvoiceFile = {
  name: string;
  path: string;
  month: string;
  day: string;
};

/** Month data with files */
type MonthFilesData = {
  month: string;
  files: InvoiceFile[];
  isLoading: boolean;
  error?: string;
};

function RecentInvoicesView({
  className,
  onBack,
  onClose,
  onDocumentSelect,
}: RecentInvoicesViewProps) {
  // State for months data with files
  const [monthsData, setMonthsData] = useState<Record<string, MonthFilesData>>({});
  // State for collapsed months
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  // Initial loading state
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Global error state
  const [globalError, setGlobalError] = useState<string | null>(null);
  // Search query
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all files for a specific month
  const fetchFilesForMonth = useCallback(async (month: string) => {
    const monthPath = `${XMLP_BASE_PATH}/${XMLP_YEAR}/${month}`;

    setMonthsData((prev) => ({
      ...prev,
      [month]: { month, files: [], isLoading: true },
    }));

    try {
      // First, get all days in this month
      const daysResponse = await fetch(
        `/api/smb?action=browse&path=${encodeURIComponent(monthPath)}`
      );
      const daysData = await daysResponse.json();

      if (!daysData.success) {
        setMonthsData((prev) => ({
          ...prev,
          [month]: {
            month,
            files: [],
            isLoading: false,
            error: daysData.error ?? "Errore nel caricamento",
          },
        }));
        return;
      }

      // Get day folders
      const days = daysData.entries
        .filter(
          (entry: { type: string; name: string }) =>
            entry.type === "folder" && TWO_DIGIT_FOLDER_REGEX.test(entry.name)
        )
        .map((entry: { name: string }) => entry.name)
        .sort()
        .reverse(); // Most recent days first

      // Fetch files for each day in parallel
      const allFiles: InvoiceFile[] = [];
      const dayPromises = days.map(async (day: string) => {
        const dayPath = `${monthPath}/${day}`;
        try {
          const filesResponse = await fetch(
            `/api/smb?action=browse&path=${encodeURIComponent(dayPath)}`
          );
          const filesData = await filesResponse.json();

          if (filesData.success) {
            const xmlFiles = filesData.entries
              .filter(
                (entry: { type: string; name: string }) =>
                  entry.type === "file" && entry.name.toLowerCase().endsWith(".xml")
              )
              .map((entry: { name: string; path: string }) => ({
                name: entry.name,
                path: entry.path,
                month,
                day,
              }));
            return xmlFiles;
          }
        } catch {
          // Ignore individual day errors
        }
        return [];
      });

      const dayResults = await Promise.all(dayPromises);
      for (const files of dayResults) {
        allFiles.push(...files);
      }

      // Sort files by day (descending)
      allFiles.sort((a, b) => b.day.localeCompare(a.day));

      setMonthsData((prev) => ({
        ...prev,
        [month]: { month, files: allFiles, isLoading: false },
      }));
    } catch (error) {
      setMonthsData((prev) => ({
        ...prev,
        [month]: {
          month,
          files: [],
          isLoading: false,
          error: String(error),
        },
      }));
    }
  }, []);

  // Load all months on mount
  useEffect(() => {
    const loadAllMonths = async () => {
      setIsInitialLoading(true);
      setGlobalError(null);

      try {
        const yearPath = `${XMLP_BASE_PATH}/${XMLP_YEAR}`;
        const response = await fetch(
          `/api/smb?action=browse&path=${encodeURIComponent(yearPath)}`
        );
        const data = await response.json();

        if (!data.success) {
          setGlobalError(data.error ?? "Errore nel caricamento");
          setIsInitialLoading(false);
          return;
        }

        // Get month folders
        const months = data.entries
          .filter(
            (entry: { type: string; name: string }) =>
              entry.type === "folder" && TWO_DIGIT_FOLDER_REGEX.test(entry.name)
          )
          .map((entry: { name: string }) => entry.name)
          .sort()
          .reverse(); // Most recent months first

        // Initialize all months as loading
        const initialMonthsData: Record<string, MonthFilesData> = {};
        for (const month of months) {
          initialMonthsData[month] = { month, files: [], isLoading: true };
        }
        setMonthsData(initialMonthsData);
        setIsInitialLoading(false);

        // Fetch files for each month in parallel (max 3 concurrent)
        const chunkSize = 3;
        for (let i = 0; i < months.length; i += chunkSize) {
          const chunk = months.slice(i, i + chunkSize);
          await Promise.all(chunk.map((month: string) => fetchFilesForMonth(month)));
        }
      } catch (error) {
        setGlobalError(String(error));
        setIsInitialLoading(false);
      }
    };

    loadAllMonths();
  }, [fetchFilesForMonth]);

  // Handle file click
  const handleFileClick = useCallback(
    (filePath: string) => {
      const recordId = `sibac-shared:${filePath}`;
      onDocumentSelect(recordId);
    },
    [onDocumentSelect]
  );

  // Toggle month collapse
  const toggleMonthCollapse = useCallback((month: string) => {
    setCollapsedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  }, []);

  // Filter files by search query
  const filterFiles = useCallback(
    (files: InvoiceFile[]) => {
      if (!searchQuery) {
        return files;
      }
      const query = searchQuery.toLowerCase();
      return files.filter((f) => f.name.toLowerCase().includes(query));
    },
    [searchQuery]
  );

  // Get sorted months
  const sortedMonths = useMemo(() => {
    return Object.keys(monthsData).sort().reverse();
  }, [monthsData]);

  // Calculate total file count
  const totalFileCount = useMemo(() => {
    return Object.values(monthsData).reduce(
      (total, month) => total + month.files.length,
      0
    );
  }, [monthsData]);

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" variant="outline">
              {totalFileCount} fatture
            </Badge>
          </div>
        }
        onClose={onClose}
        subtitle="Fatture elettroniche 2026"
        title="Fatture recenti"
      />

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Back Navigation Header */}
          <div className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-3">
              <Button
                className="gap-2"
                onClick={onBack}
                size="sm"
                variant="ghost"
              >
                <ArrowLeft className="size-4" />
                Indietro
              </Button>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-sm">Fatture 2026</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="border-border border-b px-6 py-4">
            <div className="relative max-w-md">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca fatture..."
                value={searchQuery}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Initial Loading State */}
            {isInitialLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="size-8 animate-spin text-amber-600" />
                <p className="text-muted-foreground text-sm">Caricamento fatture 2026...</p>
              </div>
            )}

            {/* Global Error State */}
            {globalError && (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <p className="font-medium">Errore nel caricamento</p>
                <p className="mt-1 text-sm">{globalError}</p>
              </div>
            )}

            {/* Month Sections */}
            {!isInitialLoading && !globalError && (
              <div className="divide-y divide-border">
                {sortedMonths.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <FileText className="size-12 opacity-30" />
                    <p>Nessuna fattura trovata per il 2026</p>
                  </div>
                ) : (
                  sortedMonths.map((month) => (
                    <MonthTableSection
                      collapsedMonths={collapsedMonths}
                      filterFiles={filterFiles}
                      key={month}
                      month={month}
                      monthData={monthsData[month]}
                      onFileClick={handleFileClick}
                      onToggleCollapse={toggleMonthCollapse}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

// ============================================================================
// MONTH TABLE SECTION
// ============================================================================

type MonthTableSectionProps = {
  month: string;
  monthData: MonthFilesData;
  collapsedMonths: Set<string>;
  onToggleCollapse: (month: string) => void;
  onFileClick: (filePath: string) => void;
  filterFiles: (files: InvoiceFile[]) => InvoiceFile[];
};

function MonthTableSection({
  month,
  monthData,
  collapsedMonths,
  onToggleCollapse,
  onFileClick,
  filterFiles,
}: MonthTableSectionProps) {
  const isCollapsed = collapsedMonths.has(month);
  const monthName = MONTH_NAMES[month] ?? month;
  const filteredFiles = filterFiles(monthData.files);

  return (
    <div className="bg-background">
      {/* Month Header */}
      <button
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          "hover:bg-muted/50",
          "sticky top-0 z-10 bg-muted/80 backdrop-blur-sm"
        )}
        onClick={() => onToggleCollapse(month)}
        type="button"
      >
        <ChevronRight
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !isCollapsed && "rotate-90"
          )}
        />
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
          <span className="font-semibold text-amber-700 text-sm dark:text-amber-300">
            {month}
          </span>
        </div>
        <span className="flex-1 font-semibold">{monthName}</span>
        {monthData.isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Badge variant="secondary">
            {filteredFiles.length} {filteredFiles.length === 1 ? "fattura" : "fatture"}
          </Badge>
        )}
      </button>

      {/* Month Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Loading State */}
          {monthData.isLoading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          )}

          {/* Error State */}
          {monthData.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {monthData.error}
            </div>
          )}

          {/* Files Table */}
          {!monthData.isLoading && !monthData.error && filteredFiles.length === 0 && (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Nessun file trovato
            </div>
          )}

          {/* Files Table Content */}
          {!monthData.isLoading && !monthData.error && filteredFiles.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-24">Data</TableHead>
                    <TableHead>Nome File</TableHead>
                    <TableHead className="w-20 text-right">Azione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow
                      className="cursor-pointer transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                      key={file.path}
                      onClick={() => onFileClick(file.path)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-muted-foreground">
                            {file.day}
                          </span>
                          <span className="text-muted-foreground/60 text-xs">
                            {MONTH_NAMES_SHORT[file.month]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 shrink-0 text-blue-500" />
                          <span className="truncate text-sm">{file.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileClick(file.path);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          Apri
                          <ChevronRight className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FOLDER HELPER FUNCTIONS
// ============================================================================

/**
 * Get the appropriate icon component for a folder based on its type
 */
function getFolderIcon(folder: FileSystemFolder) {
  if (folder.icon === "database") {
    return Database;
  }
  if (folder.icon === "database-off") {
    return DatabaseZap;
  }
  if (folder.icon === "folder-sync") {
    return FolderSync;
  }
  if (folder.id === "folder:local") {
    return HardDrive;
  }
  return Folder;
}

/**
 * Get color classes for a folder based on its type
 */
function getFolderColorClasses(folder: FileSystemFolder): {
  bg: string;
  icon: string;
} {
  const isSibacShared = folder.id === "folder:sibac-shared";
  const isOracle = folder.id === "folder:oracle";

  if (isSibacShared || folder.icon === "folder-sync") {
    return {
      bg: "bg-blue-100 dark:bg-blue-950",
      icon: "text-blue-600 dark:text-blue-400",
    };
  }
  if (
    isOracle ||
    folder.icon === "database" ||
    folder.icon === "database-off"
  ) {
    return {
      bg: "bg-purple-100 dark:bg-purple-950",
      icon: "text-purple-600 dark:text-purple-400",
    };
  }
  return {
    bg: "bg-amber-100 dark:bg-amber-950",
    icon: "text-amber-600 dark:text-amber-400",
  };
}

// ============================================================================
// FILE CARD (Squared Card for Grid View)
// ============================================================================

type FileCardProps = {
  file: FileSystemFile;
  onClick: () => void;
};

function FileCard({ file, onClick }: FileCardProps) {
  const displayName = file.displayName ?? file.name;
  const isValid = file.fatturaValida;

  return (
    <button
      className={cn(
        "group flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-all",
        "hover:border-primary/50 hover:bg-accent/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      onClick={onClick}
      type="button"
    >
      {/* File Icon with validation color */}
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
          isValid
            ? "bg-blue-100 dark:bg-blue-950"
            : "bg-red-100 dark:bg-red-950"
        )}
      >
        <FileText
          className={cn(
            "size-6",
            isValid
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
          )}
        />
      </div>

      {/* File Name */}
      <p className="line-clamp-2 w-full font-medium text-xs leading-tight">
        {displayName}
      </p>

      {/* Validation Indicator (small dot) */}
      <div
        className={cn(
          "size-2.5 rounded-full",
          isValid ? "bg-emerald-500" : "bg-red-500"
        )}
        title={isValid ? "Fattura valida" : "Fattura non valida"}
      />
    </button>
  );
}

// ============================================================================
// FILE LIST ITEM (Horizontal item for List View)
// ============================================================================

type FileListItemProps = {
  file: FileSystemFile;
  onClick: () => void;
};

function FileListItem({ file, onClick }: FileListItemProps) {
  const displayName = file.displayName ?? file.name;
  const isValid = file.fatturaValida;
  const isOracle = file.source === "oracle";

  return (
    <button
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all",
        "hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm"
      )}
      onClick={onClick}
      type="button"
    >
      {/* File Icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          isValid
            ? "bg-blue-100 dark:bg-blue-950"
            : "bg-red-100 dark:bg-red-950"
        )}
      >
        <FileText
          className={cn(
            "size-5",
            isValid
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
          )}
        />
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{displayName}</p>
        {isOracle && (
          <p className="truncate text-muted-foreground text-xs">Database</p>
        )}
      </div>

      {/* Validation Badge */}
      <ValidationBadge isValid={isValid} />
    </button>
  );
}

// ============================================================================
// EMPTY FOLDER MESSAGE
// ============================================================================

type EmptyFolderMessageProps = {
  currentFolder: FileSystemFolder | null;
  searchQuery: string;
};

function EmptyFolderMessage({
  currentFolder,
  searchQuery,
}: EmptyFolderMessageProps) {
  // If searching, show search-specific message
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Search className="mb-3 size-10 opacity-50" />
        <p className="font-medium">Nessun risultato trovato</p>
        <p className="text-sm">Prova con un termine di ricerca diverso</p>
      </div>
    );
  }

  // Show folder-specific empty messages
  const isOracleFolder = currentFolder?.id === "folder:oracle";
  const isSibacSharedFolder = currentFolder?.id === "folder:sibac-shared";

  let message = "Nessun documento in questa cartella.";
  if (currentFolder?.errorMessage) {
    message = currentFolder.errorMessage;
  } else if (isOracleFolder) {
    message = getOracleErrorMessage(currentFolder?.errorStatus);
  } else if (isSibacSharedFolder) {
    message = getSibacErrorMessage(currentFolder?.errorStatus);
  } else if (!currentFolder) {
    message = "Nessun documento disponibile.";
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <Folder className="mb-3 size-10 opacity-50" />
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// ERROR MESSAGE HELPERS
// ============================================================================

/**
 * Get appropriate error message for Oracle folder based on error status
 */
function getOracleErrorMessage(errorStatus?: FolderErrorStatus): string {
  switch (errorStatus) {
    case "vpn_disconnected":
      return "VPN non connesso. Connettere al VPN per accedere al database.";
    case "server_unreachable":
      return "Server Oracle non raggiungibile. Verificare la configurazione VPN.";
    case "port_blocked":
      return "Porta Oracle 1521 non raggiungibile. Il servizio Oracle potrebbe essere spento o bloccato dal firewall.";
    case "unknown_error":
      return "Errore di connessione al database. Riprovare più tardi.";
    case "ok":
      return "Nessun impegno trovato nel database.";
    default:
      return "Nessun documento disponibile. Verificare la connessione VPN.";
  }
}

/**
 * Get appropriate error message for SIBAC shared folder based on error status
 */
function getSibacErrorMessage(errorStatus?: FolderErrorStatus): string {
  switch (errorStatus) {
    case "vpn_disconnected":
      return "VPN non connesso. Connettere al VPN per sincronizzare i file.";
    case "smb_error":
      return "Impossibile accedere alla cartella condivisa Windows. Verificare le credenziali SMB.";
    case "sync_pending":
      return "Sincronizzazione in corso...";
    case "ok":
      return "Nessun file nella cartella condivisa.";
    default:
      return "Nessun file nella cartella condivisa. Copiare i file da Windows (192.168.0.204).";
  }
}

// ============================================================================
// VALIDATION BADGE
// ============================================================================

function ValidationBadge({ isValid }: { isValid: boolean }) {
  if (isValid) {
    return (
      <Badge
        aria-label="Stato: Fattura valida"
        className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        variant="outline"
      >
        ✓ Fattura valida
      </Badge>
    );
  }

  return (
    <Badge
      aria-label="Stato: Fattura non valida"
      className="border-red-200 bg-red-50 font-medium text-red-700 text-xs dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      variant="outline"
    >
      ✗ Fattura non valida
    </Badge>
  );
}

// ============================================================================
// EXTRACTED DATA CARD
// ============================================================================

type ExtractedDataCardProps = {
  label: string;
  value: string | number | null | undefined;
  status: FieldStatus;
  editable?: boolean;
  onValueChange?: (newValue: string) => void;
};

function ExtractedDataCard({
  label,
  value,
  status,
  editable = false,
  onValueChange,
}: ExtractedDataCardProps) {
  const styles = getFieldStatusStyles(status);
  const displayValue =
    value !== null && value !== undefined ? String(value) : "N/A";
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayValue);

  const handleSave = () => {
    onValueChange?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(displayValue);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-3 transition-all",
        styles.bg,
        styles.border
      )}
    >
      <span
        className={cn(
          "font-medium text-xs uppercase tracking-wide",
          styles.label
        )}
      >
        {label}
      </span>
      {isEditing ? (
        <div className="mt-1 flex items-center gap-2">
          <Input
            autoFocus
            className="h-7 text-sm"
            onChange={(e) => setEditValue(e.target.value)}
            value={editValue}
          />
          <Button
            className="h-7 px-2"
            onClick={handleSave}
            size="sm"
            variant="ghost"
          >
            ✓
          </Button>
          <Button
            className="h-7 px-2"
            onClick={handleCancel}
            size="sm"
            variant="ghost"
          >
            ✗
          </Button>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className={cn("truncate font-semibold text-sm", styles.value)}>
            {displayValue}
          </span>
          {editable && (
            <Button
              className="h-6 px-2 text-xs opacity-60 hover:opacity-100"
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="ghost"
            >
              Modifica
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INVOICE DETAIL VIEW
// ============================================================================

type InvoiceDetailViewProps = {
  className?: string;
  invoiceData: InvoiceData;
  onBack: () => void;
  onClose: () => void;
};

function InvoiceDetailView({
  className,
  invoiceData,
  onBack,
  onClose,
}: InvoiceDetailViewProps) {
  const { metadata, validation } = invoiceData;

  // Local state for editable fields
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const getFieldValue = (
    fieldName: string,
    originalValue: string | number | null | undefined
  ) => {
    return editedFields[fieldName] ?? originalValue;
  };

  // Format currency
  const formatCurrency = (
    amount: number | null | undefined,
    currency = "EUR"
  ) => {
    if (amount === null || amount === undefined) {
      return null;
    }
    return `${amount.toLocaleString("it-IT", { minimumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`;
  };

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 border-border border-b px-4 py-3">
        <Button className="gap-2" onClick={onBack} size="sm" variant="ghost">
          <ArrowLeft className="size-4" />
          Indietro
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">Dettaglio Documento</h2>
          <p className="text-muted-foreground text-xs">{metadata.fileName}</p>
        </div>
        <ValidationBadge isValid={validation.fatturaValida} />
        <Button
          className="size-8"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <XCircle className="size-4" />
        </Button>
      </div>

      <ChatArtifactBody>
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Extracted Data Section */}
          <div className="border-border border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5 dark:from-emerald-950/30 dark:to-teal-950/30">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
                Dati estratti dall'AI
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ExtractedDataCard
                editable
                label="IBAN"
                onValueChange={(v) => handleFieldChange("iban", v)}
                status={getFieldStatus(
                  "iban",
                  validation.iban,
                  validation.campiMancanti,
                  validation.campiNonValidi
                )}
                value={getFieldValue("iban", validation.iban)}
              />
              <ExtractedDataCard
                editable
                label="Costo Totale"
                onValueChange={(v) => handleFieldChange("importoSpesa", v)}
                status={getFieldStatus(
                  "importo",
                  validation.importoSpesa,
                  validation.campiMancanti,
                  validation.campiNonValidi
                )}
                value={formatCurrency(
                  validation.importoSpesa,
                  metadata.currency
                )}
              />
              <ExtractedDataCard
                editable
                label="CIG"
                onValueChange={(v) => handleFieldChange("cig", v)}
                status={getFieldStatus(
                  "cig",
                  validation.cig,
                  validation.campiMancanti,
                  validation.campiNonValidi
                )}
                value={getFieldValue("cig", validation.cig)}
              />
              <ExtractedDataCard
                editable
                label="CUP"
                onValueChange={(v) => handleFieldChange("cup", v)}
                status={getFieldStatus(
                  "cup",
                  validation.cup,
                  validation.campiMancanti,
                  validation.campiNonValidi
                )}
                value={getFieldValue("cup", validation.cup)}
              />
            </div>
          </div>

          {/* Original Invoice Section */}
          <div className="flex-1 px-6 py-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">
                Fattura originale
              </h3>
            </div>

            <ParsedInvoiceRenderer
              content={invoiceData.content}
              metadata={metadata}
              validation={validation}
            />
          </div>
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

// ============================================================================
// PARSED INVOICE RENDERER
// ============================================================================

import { parseInvoice } from "@/lib/invoice-parser";

type ParsedInvoiceRendererProps = {
  metadata: InvoiceMetadata;
  validation: InvoiceValidationResult;
  content: string;
};

function ParsedInvoiceRenderer({
  metadata,
  validation,
  content,
}: ParsedInvoiceRendererProps) {
  // Parse additional data from XML content
  const parsedData = useMemo(() => parseInvoice(content), [content]);

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return;
    }
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("it-IT");
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amountStr?: string) => {
    if (!amountStr) {
      return;
    }
    const num = Number.parseFloat(amountStr);
    return Number.isNaN(num)
      ? amountStr
      : `${num.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €`;
  };

  return (
    <div className="space-y-6">
      {/* Electronic Invoice Header */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-border border-b px-4 py-3">
          <Receipt className="size-5 text-blue-500" />
          <h4 className="font-semibold">Fattura Elettronica</h4>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              variant="outline"
            >
              Numero: {metadata.invoiceNumber}
            </Badge>
            <Badge
              className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              variant="outline"
            >
              Data: {formatDate(metadata.date)}
            </Badge>
            <Badge
              className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              variant="outline"
            >
              Tipo: {metadata.documentType}
            </Badge>
            <Badge
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              variant="outline"
            >
              Stato: {metadata.currency || "EUR"}
            </Badge>
          </div>
        </div>

        {/* Transmission Data */}
        <div className="border-border border-b px-4 py-3">
          <div className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            <Hash className="size-3" />
            Dati Trasmissione
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ID Paese:</span>{" "}
              <span className="font-medium">IT</span>
            </div>
            <div>
              <span className="text-muted-foreground">ID Codice:</span>{" "}
              <span className="font-medium">{metadata.supplierVatId}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Progressivo Invio:</span>{" "}
              <span className="font-medium">
                {parsedData.trasmissione.progressivo}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Codice Destinatario:
              </span>{" "}
              <span className="font-medium">
                {parsedData.trasmissione.codiceDestinatario}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Formato Trasmissione:</span>{" "}
            <span className="font-medium">
              {parsedData.trasmissione.formatoTrasmissione}
            </span>
          </div>
        </div>

        {/* Supplier and Buyer */}
        <div className="grid grid-cols-2 divide-x divide-border">
          {/* Supplier */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Building2 className="size-4" />
              <span className="font-semibold text-sm">Cedente/Prestatore</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-base">{metadata.supplier}</p>
              <p className="text-muted-foreground">
                Codice Fiscale: {validation.codiceFiscale || "N/A"}
              </p>
              <p className="text-muted-foreground">
                P.IVA: IT{metadata.supplierVatId}
              </p>
              <p className="text-muted-foreground">Regime Fiscale: RF01</p>

              {parsedData.supplierAddress.indirizzo && (
                <div className="mt-3 flex items-start gap-2 border-border border-t pt-2">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p>{parsedData.supplierAddress.indirizzo}</p>
                    <p>
                      {parsedData.supplierAddress.cap}{" "}
                      {parsedData.supplierAddress.comune} (
                      {parsedData.supplierAddress.provincia})
                    </p>
                    <p>{parsedData.supplierAddress.nazione}</p>
                  </div>
                </div>
              )}

              {parsedData.reaData.ufficio && (
                <div className="mt-3 border-border border-t pt-2">
                  <p className="font-medium text-muted-foreground">
                    Iscrizione REA
                  </p>
                  <p>Ufficio: {parsedData.reaData.ufficio}</p>
                  <p>Numero REA: {parsedData.reaData.numero}</p>
                  <p>
                    Capitale Sociale:{" "}
                    {formatAmount(parsedData.reaData.capitale)}
                  </p>
                  <p>Socio Unico: {parsedData.reaData.socioUnico}</p>
                  <p>
                    Stato Liquidazione: {parsedData.reaData.statoLiquidazione}
                  </p>
                </div>
              )}

              {(parsedData.contatti.telefono || parsedData.contatti.email) && (
                <div className="mt-3 border-border border-t pt-2">
                  {parsedData.contatti.telefono && (
                    <p>📞 {parsedData.contatti.telefono}</p>
                  )}
                  {parsedData.contatti.fax && (
                    <p>📠 Fax: {parsedData.contatti.fax}</p>
                  )}
                  {parsedData.contatti.email && (
                    <p>✉️ {parsedData.contatti.email}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Buyer */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <User className="size-4" />
              <span className="font-semibold text-sm">
                Cessionario/Committente
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-base">{metadata.buyer}</p>
              <p className="text-muted-foreground">
                P.IVA: IT{metadata.buyerVatId}
              </p>

              {parsedData.buyerAddress.indirizzo && (
                <div className="mt-3 flex items-start gap-2 border-border border-t pt-2">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p>{parsedData.buyerAddress.indirizzo}</p>
                    <p>
                      {parsedData.buyerAddress.cap}{" "}
                      {parsedData.buyerAddress.comune} (
                      {parsedData.buyerAddress.provincia})
                    </p>
                    <p>{parsedData.buyerAddress.nazione}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Data */}
      {parsedData.ordineData.idDocumento && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <Package className="size-4" />
              <span className="font-semibold text-sm">
                Dati Ordine Acquisto
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">ID Documento:</span>{" "}
                {parsedData.ordineData.idDocumento}
              </p>
              {parsedData.ordineData.numItem && (
                <p>
                  <span className="text-muted-foreground">Numero Item:</span>{" "}
                  {parsedData.ordineData.numItem}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Codice CIG:</span>{" "}
                <span className="font-semibold">
                  {parsedData.ordineData.codiceCIG || validation.cig || "N/A"}
                </span>
              </p>
              {parsedData.ordineData.codiceCUP && (
                <p>
                  <span className="text-muted-foreground">Codice CUP:</span>{" "}
                  <span className="font-semibold">
                    {parsedData.ordineData.codiceCUP}
                  </span>
                </p>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                <Badge
                  className="bg-white text-xs dark:bg-background"
                  key={`cig-badge-${num}`}
                  variant="outline"
                >
                  {num}
                </Badge>
              ))}
              <Badge
                className="bg-emerald-200 text-emerald-800 text-xs dark:bg-emerald-800 dark:text-emerald-200"
                variant="outline"
              >
                N
              </Badge>
            </div>
          </div>

          {parsedData.salData.riferimentoFase && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Hash className="size-4" />
                <span className="font-semibold text-sm">Dati SAL</span>
              </div>
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">Numero SAL:</span>{" "}
                  {parsedData.salData.riferimentoFase}
                </p>
                {parsedData.ddtData.numeroDDT && (
                  <p className="mt-2">
                    <span className="text-muted-foreground">Data DDT:</span>{" "}
                    {formatDate(parsedData.ddtData.dataDDT)}
                  </p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                  <Badge
                    className="bg-white text-xs dark:bg-background"
                    key={`sal-badge-${num}`}
                    variant="outline"
                  >
                    {num}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Causale */}
      {parsedData.causale && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <FileText className="size-4" />
            <span className="font-semibold text-sm">Causale</span>
          </div>
          <p className="text-sm">{parsedData.causale}</p>
        </div>
      )}

      {/* Line Items */}
      {parsedData.lineItems.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-border border-b px-4 py-3">
            <Package className="size-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Dettaglio Linee</span>
          </div>
          <div className="divide-y divide-border">
            {parsedData.lineItems.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: items don't have stable unique IDs
              <div className="p-4" key={`line-${index}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        "shrink-0",
                        index % 2 === 0
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                      )}
                      variant="outline"
                    >
                      {item.numero}
                    </Badge>
                    <span className="font-medium text-sm">
                      {item.descrizione}
                    </span>
                  </div>
                  <Badge
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    variant="outline"
                  >
                    Totale: {formatAmount(item.prezzoTotale)}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-4 text-muted-foreground text-xs">
                  <div>
                    <span className="font-medium">Quantità:</span>{" "}
                    {item.quantita || "1"}
                  </div>
                  <div>
                    <span className="font-medium">Prezzo Unitario:</span>{" "}
                    {formatAmount(item.prezzoUnitario)}
                  </div>
                  {item.sconto && (
                    <div>
                      <span className="font-medium">% Sconto:</span>{" "}
                      <span className="text-orange-600 dark:text-orange-400">
                        {item.sconto}%
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">IVA:</span> {item.aliquotaIVA}
                    %
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VAT Summary */}
      {parsedData.ivaRiepilogo.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Receipt className="size-4" />
            <span className="font-semibold text-sm">Riepilogo IVA</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-white p-3 dark:bg-background">
              <p className="text-muted-foreground text-xs uppercase">
                Aliquota IVA
              </p>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                {parsedData.ivaRiepilogo[0]?.aliquota}%
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-background">
              <p className="text-muted-foreground text-xs uppercase">
                Imponibile
              </p>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                {formatAmount(parsedData.ivaRiepilogo[0]?.imponibile)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-background">
              <p className="text-muted-foreground text-xs uppercase">Imposta</p>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {formatAmount(parsedData.ivaRiepilogo[0]?.imposta)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 dark:bg-background">
              <p className="text-muted-foreground text-xs uppercase">
                Totale Documento
              </p>
              <p className="font-semibold text-purple-700 dark:text-purple-300">
                {formatAmount(String(metadata.totalAmount))}
              </p>
            </div>
          </div>
          {parsedData.ivaRiepilogo[0]?.esigibilita && (
            <p className="mt-3 text-muted-foreground text-sm">
              Esigibilità IVA:{" "}
              <span className="font-medium">
                {parsedData.ivaRiepilogo[0].esigibilita === "I"
                  ? "Immediata"
                  : parsedData.ivaRiepilogo[0].esigibilita}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Payment Data */}
      {parsedData.pagamento.modalita && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-border border-b px-4 py-3">
            <CreditCard className="size-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Dati Pagamento</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="space-y-2 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">
                  Condizioni Pagamento:
                </span>{" "}
                {parsedData.pagamento.condizioni}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Modalità Pagamento:
                </span>{" "}
                {parsedData.pagamento.modalita}
              </p>
              {parsedData.pagamento.dataScadenza && (
                <p>
                  <span className="text-muted-foreground">Data Scadenza:</span>{" "}
                  {formatDate(parsedData.pagamento.dataScadenza)}
                </p>
              )}
            </div>
            <div className="space-y-2 p-4 text-sm">
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
                <p className="text-muted-foreground text-xs uppercase">
                  Importo Pagamento
                </p>
                <p className="font-semibold text-blue-700 text-lg dark:text-blue-300">
                  {formatAmount(parsedData.pagamento.importo)}
                </p>
              </div>
              {parsedData.pagamento.istituto && (
                <p>
                  <span className="text-muted-foreground">
                    Istituto Finanziario:
                  </span>{" "}
                  {parsedData.pagamento.istituto}
                </p>
              )}
              {parsedData.pagamento.iban && (
                <p>
                  <span className="text-muted-foreground">IBAN:</span>{" "}
                  <span className="font-mono">{parsedData.pagamento.iban}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
