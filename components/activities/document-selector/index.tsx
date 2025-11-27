"use client";

import {
  FileText,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CheckCircle2,
  Files,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useChatRuntime } from "@/components/chat/context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UIDocumentSelectorActivity, DocumentStatus } from "./schema";

/**
 * DocumentSelectorActivity Props
 */
export type DocumentSelectorActivityProps = {
  /** Activity configuration with title, description, and payload */
  activity: UIDocumentSelectorActivity;
};

/** Format bytes to human readable size */
function formatFileSize(bytes?: number): string {
  if (!bytes) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/** Format date to display format */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/** Status badge configuration */
const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  completato: {
    label: "Completato",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  in_elaborazione: {
    label: "In elaborazione",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  in_attesa: {
    label: "In attesa",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
};

/**
 * DocumentSelectorActivity component
 *
 * Displays available documents in a modern card grid with search, filters, and stats.
 * When a document is clicked, sends a message to load it.
 */
export function DocumentSelectorActivity({
  activity,
}: DocumentSelectorActivityProps) {
  const { chat } = useChatRuntime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const documents = activity.payload;

  // Calculate stats
  const stats = useMemo(() => {
    const completedCount = documents.filter(
      (d) => d.status === "completato"
    ).length;
    return {
      completed: completedCount,
      total: documents.length,
    };
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !searchQuery ||
        doc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fileId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, searchQuery, statusFilter]);

  const handleDocumentSelect = useCallback(
    (fileId: string) => {
      setSelectedId(fileId);
      chat.sendMessage({
        role: "user",
        parts: [{ type: "text", text: `Carica il documento ${fileId}` }],
      });
    },
    [chat]
  );

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-muted-foreground text-sm">
        Nessun documento disponibile
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-background shadow-sm"
      data-slot="document-selector-activity"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {activity.title || "Documenti Disponibili"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestisci e visualizza tutti i tuoi documenti
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            <span className="font-medium">{stats.completed} completati</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Files className="size-4" />
            <span className="font-medium">{stats.total} totali</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cerca documenti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Filtri"
          >
            <SlidersHorizontal className="size-4" />
          </button>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="in_elaborazione">In elaborazione</SelectItem>
              <SelectItem value="in_attesa">In attesa</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex rounded-md border border-input">
            <button
              type="button"
              className={cn(
                "flex size-9 items-center justify-center rounded-l-md transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setViewMode("grid")}
              title="Vista griglia"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              className={cn(
                "flex size-9 items-center justify-center rounded-r-md border-l border-input transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setViewMode("list")}
              title="Vista lista"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Grid/List */}
      <div
        className={cn(
          "p-4",
          viewMode === "grid"
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2"
        )}
      >
        {filteredDocuments.map((doc) => {
          const isSelected = selectedId === doc.fileId;
          const statusConfig = STATUS_CONFIG[doc.status || "completato"];

          if (viewMode === "list") {
            return (
              <button
                key={doc.fileId}
                type="button"
                onClick={() => handleDocumentSelect(doc.fileId)}
                disabled={isSelected}
                className={cn(
                  "flex items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-accent/50 hover:shadow-sm",
                  isSelected && "ring-2 ring-primary bg-accent/30"
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {doc.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.code}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(doc.size)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(doc.date)}
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs", statusConfig.className)}
                >
                  {statusConfig.label}
                </Badge>
              </button>
            );
          }

          return (
            <button
              key={doc.fileId}
              type="button"
              onClick={() => handleDocumentSelect(doc.fileId)}
              disabled={isSelected}
              className={cn(
                "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-accent/50 hover:shadow-md",
                isSelected && "ring-2 ring-primary bg-accent/30"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                  <FileText className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate leading-tight">
                    {doc.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {doc.code}
                  </p>
                </div>
              </div>

              {/* Card Metadata */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <span>{formatDate(doc.date)}</span>
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    statusConfig.className
                  )}
                >
                  ✓ {statusConfig.label}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty filtered state */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
          Nessun documento trovato con i filtri applicati
        </div>
      )}

      {/* Loading indicator */}
      {selectedId && (
        <div className="border-t border-border px-6 py-3 text-sm text-muted-foreground">
          Caricamento documento in corso...
        </div>
      )}
    </div>
  );
}

