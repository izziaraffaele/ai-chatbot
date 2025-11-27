"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Files,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useChatRuntime } from "@/components/chat/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatToolProps } from "./types";

/**
 * File validation info
 */
type FileValidation = {
  fileId: string;
  fatturaValida: boolean;
  campiMancanti: string[];
  campiNonValidi: string[];
};

/**
 * Validation result for a loaded invoice
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
 * LoadInvoice Tool Output structure
 */
type LoadInvoiceOutput = {
  success: boolean;
  error?: string;
  metadata?: {
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
  content?: string;
  availableFiles?: string[];
  filesWithValidation?: FileValidation[];
  validation?: InvoiceValidationResult;
};

/**
 * Extracts a display-friendly name from a file ID
 */
function getDisplayName(fileId: string): string {
  const vatMatch = fileId.match(/IT\d+/);
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
 * Extracts a secondary code from a file ID
 */
function getCodeFromFileId(fileId: string): string {
  const bracketMatch = fileId.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    return `A-[${bracketMatch[1]}]`;
  }
  return fileId.slice(-12);
}

/**
 * LoadInvoice Tool UI Component
 *
 * Renders the output of the loadInvoice tool:
 * - When availableFiles is returned: shows a document selector grid with validation status
 * - When metadata/content is returned: shows invoice details summary with validation
 */
export function LoadInvoiceTool({ part }: ChatToolProps) {
  const output = part.output as LoadInvoiceOutput | undefined;
  const { chat } = useChatRuntime();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  // If no output yet (streaming), show loading
  if (!output) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground text-sm">
        Caricamento in corso...
      </div>
    );
  }

  // If error occurred
  if (!output.success && output.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {output.error}
      </div>
    );
  }

  // If filesWithValidation returned - show document selector with validation
  if (output.filesWithValidation && output.filesWithValidation.length > 0) {
    return (
      <DocumentSelector
        filesWithValidation={output.filesWithValidation}
        selectedId={selectedId}
        searchQuery={searchQuery}
        viewMode={viewMode}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onSelect={handleDocumentSelect}
      />
    );
  }

  // Legacy support: If only availableFiles returned (no validation)
  if (output.availableFiles && output.availableFiles.length > 0) {
    const legacyFilesWithValidation = output.availableFiles.map((fileId) => ({
      fileId,
      fatturaValida: true,
      campiMancanti: [],
      campiNonValidi: [],
    }));
    return (
      <DocumentSelector
        filesWithValidation={legacyFilesWithValidation}
        selectedId={selectedId}
        searchQuery={searchQuery}
        viewMode={viewMode}
        onSearchChange={setSearchQuery}
        onViewModeChange={setViewMode}
        onSelect={handleDocumentSelect}
      />
    );
  }

  // If metadata returned - show invoice details (document was loaded)
  if (output.metadata) {
    return (
      <InvoiceDetails
        metadata={output.metadata}
        validation={output.validation}
      />
    );
  }

  // Fallback - empty state
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
      Nessun documento trovato
    </div>
  );
}

/**
 * Document Selector Component with Validation Status
 */
function DocumentSelector({
  filesWithValidation,
  selectedId,
  searchQuery,
  viewMode,
  onSearchChange,
  onViewModeChange,
  onSelect,
}: {
  filesWithValidation: FileValidation[];
  selectedId: string | null;
  searchQuery: string;
  viewMode: "grid" | "list";
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSelect: (fileId: string) => void;
}) {
  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return filesWithValidation;
    const query = searchQuery.toLowerCase();
    return filesWithValidation.filter(
      (f) =>
        f.fileId.toLowerCase().includes(query) ||
        getDisplayName(f.fileId).toLowerCase().includes(query)
    );
  }, [filesWithValidation, searchQuery]);

  // Calculate stats
  const validCount = useMemo(
    () => filesWithValidation.filter((f) => f.fatturaValida).length,
    [filesWithValidation]
  );
  const invalidCount = filesWithValidation.length - validCount;

  return (
    <div
      className="rounded-xl border border-border bg-background shadow-sm"
      data-slot="document-selector"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-foreground text-lg">
            Documenti Disponibili
          </h2>
          <p className="text-muted-foreground text-sm">
            Seleziona un documento per caricarlo
          </p>
        </div>
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
            <span className="font-medium">{filesWithValidation.length} totali</span>
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cerca documenti..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

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
            onClick={() => onViewModeChange("grid")}
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
            onClick={() => onViewModeChange("list")}
            title="Vista lista"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      <div
        className={cn(
          "max-h-[320px] overflow-y-auto p-4",
          viewMode === "grid"
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2"
        )}
      >
        {filteredFiles.map((file) => {
          const isSelected = selectedId === file.fileId;
          const displayName = getDisplayName(file.fileId);
          const code = getCodeFromFileId(file.fileId);
          const isValid = file.fatturaValida;

          if (viewMode === "list") {
            return (
              <button
                key={file.fileId}
                type="button"
                onClick={() => onSelect(file.fileId)}
                disabled={isSelected}
                className={cn(
                  "flex items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-accent/50 hover:shadow-sm",
                  isSelected && "bg-accent/30 ring-2 ring-primary"
                )}
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
                  <p className="truncate font-medium text-sm">{displayName}</p>
                  <p className="truncate text-muted-foreground text-xs">{code}</p>
                </div>
                <ValidationBadge isValid={isValid} />
              </button>
            );
          }

          return (
            <button
              key={file.fileId}
              type="button"
              onClick={() => onSelect(file.fileId)}
              disabled={isSelected}
              className={cn(
                "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-accent/50 hover:shadow-md",
                isSelected && "bg-accent/30 ring-2 ring-primary"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    isValid
                      ? "bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400"
                      : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm leading-tight">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-muted-foreground text-xs">
                    {code}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                <ValidationBadge isValid={isValid} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty filtered state */}
      {filteredFiles.length === 0 && filesWithValidation.length > 0 && (
        <div className="px-6 pb-6 text-center text-muted-foreground text-sm">
          Nessun documento trovato con i filtri applicati
        </div>
      )}

      {/* Loading indicator */}
      {selectedId && (
        <div className="border-t border-border px-6 py-3 text-muted-foreground text-sm">
          Caricamento documento in corso...
        </div>
      )}
    </div>
  );
}

/**
 * Validation Badge Component
 */
function ValidationBadge({ isValid }: { isValid: boolean }) {
  if (isValid) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      >
        ✓ Fattura valida
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-red-200 bg-red-50 font-medium text-red-700 text-xs dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    >
      ✗ Fattura non valida
    </Badge>
  );
}

/**
 * Invoice Details Component with Validation and Analysis
 */
function InvoiceDetails({
  metadata,
  validation,
}: {
  metadata: NonNullable<LoadInvoiceOutput["metadata"]>;
  validation?: InvoiceValidationResult;
}) {
  const { chat } = useChatRuntime();
  const isValid = validation?.fatturaValida ?? true;
  const hasMissingFields =
    validation?.campiMancanti && validation.campiMancanti.length > 0;
  const hasInvalidFields =
    validation?.campiNonValidi && validation.campiNonValidi.length > 0;

  // Track if analysis was requested
  const [analysisRequested, setAnalysisRequested] = useState(false);

  // Handle the "Analizza Fattura" button click - sends message to chat
  const handleAnalyze = useCallback(() => {
    if (!validation?.campiMancanti?.length) {
      return;
    }

    setAnalysisRequested(true);

    // Build the analysis request message
    const missingFieldsList = validation.campiMancanti.join(", ");
    const message = `Analizza la fattura ${metadata.fileId} per trovare i seguenti campi mancanti: ${missingFieldsList}`;

    // Send the message to the chat agent
    chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
  }, [chat, metadata.fileId, validation?.campiMancanti]);

  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            isValid
              ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {isValid ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Documento Caricato</h3>
          <p className="text-muted-foreground text-sm">{metadata.fileName}</p>
        </div>
        <ValidationBadge isValid={isValid} />
      </div>

      {/* Validation Errors */}
      {!isValid && (hasMissingFields || hasInvalidFields) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/50">
          {hasMissingFields && (
            <div className="mb-2">
              <p className="font-medium text-red-700 text-sm dark:text-red-300">
                Campi mancanti:
              </p>
              <ul className="mt-1 ml-4 list-disc text-red-600 text-xs dark:text-red-400">
                {validation.campiMancanti.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          {hasInvalidFields && (
            <div>
              <p className="font-medium text-red-700 text-sm dark:text-red-300">
                Campi con formato non valido:
              </p>
              <ul className="mt-1 ml-4 list-disc text-red-600 text-xs dark:text-red-400">
                {validation.campiNonValidi.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-2 text-sm">
        {metadata.supplier && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fornitore:</span>
            <span className="font-medium">{metadata.supplier}</span>
          </div>
        )}
        {metadata.invoiceNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Numero Fattura:</span>
            <span className="font-medium">{metadata.invoiceNumber}</span>
          </div>
        )}
        {metadata.date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data:</span>
            <span className="font-medium">{metadata.date}</span>
          </div>
        )}
        {metadata.totalAmount != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Importo:</span>
            <span className="font-medium">
              {metadata.currency || "EUR"}{" "}
              {metadata.totalAmount.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
      </div>

      {/* Analyze Invoice Button - shown only for invalid invoices with missing fields */}
      {!isValid && hasMissingFields && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleAnalyze}
            disabled={analysisRequested}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            {analysisRequested ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analisi richiesta...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analizza Fattura
              </>
            )}
          </Button>
        </div>
      )}

      {/* Validation Details (when valid) */}
      {isValid && validation && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 font-medium text-emerald-700 text-sm dark:text-emerald-400">
            Tutti i campi obbligatori sono presenti e validi
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {validation.iban && (
              <div className="truncate">
                <span className="font-medium">IBAN:</span> {validation.iban}
              </div>
            )}
            {validation.cig && (
              <div className="truncate">
                <span className="font-medium">CIG:</span> {validation.cig}
              </div>
            )}
            {validation.cup && (
              <div className="truncate">
                <span className="font-medium">CUP:</span> {validation.cup}
              </div>
            )}
            {validation.codicePA && (
              <div className="truncate">
                <span className="font-medium">Codice PA:</span>{" "}
                {validation.codicePA}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

