"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Files,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  DOCUMENT_SELECTOR_KIND,
  type DocumentSelectorUIArtifact,
} from "@/components/artifacts/document-selector";
import { useChatRuntime } from "@/components/chat/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";
import type { ChatToolProps } from "./types";

/**
 * Shared state key for tracking the currently active document
 * This allows multiple InvoiceDetails widgets to know which one is "current"
 */
const ACTIVE_DOCUMENT_KEY = "active-invoice-document";

/**
 * Hook to get/set the currently active document ID
 * Uses SWR for shared state across components
 */
function useActiveDocument() {
  const { data: activeDocumentId, mutate: setActiveDocumentId } = useSWR<
    string | null
  >(ACTIVE_DOCUMENT_KEY, null, { fallbackData: null });

  const setActive = useCallback(
    (fileId: string | null) => {
      setActiveDocumentId(fileId, { revalidate: false });
    },
    [setActiveDocumentId]
  );

  return { activeDocumentId, setActiveDocument: setActive };
}

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
 * LoadInvoice Tool UI Component
 *
 * Renders the output of the loadInvoice tool:
 * - When availableFiles is returned: opens document selector in side panel
 * - When metadata/content is returned: shows invoice details summary with validation
 */
export function LoadInvoiceTool({ part }: ChatToolProps) {
  const output = part.output as LoadInvoiceOutput | undefined;
  const { setArtifact } = useArtifact<DocumentSelectorUIArtifact>();
  const hitboxRef = useRef<HTMLDivElement>(null);

  // Track which file set we've already opened the panel for (by signature)
  const openedForSignatureRef = useRef<string | null>(null);

  // Get files for the selector (either with validation or legacy)
  const filesWithValidation = useMemo(() => {
    if (output?.filesWithValidation && output.filesWithValidation.length > 0) {
      return output.filesWithValidation;
    }
    if (output?.availableFiles && output.availableFiles.length > 0) {
      return output.availableFiles.map((fileId) => ({
        fileId,
        fatturaValida: true,
        campiMancanti: [] as string[],
        campiNonValidi: [] as string[],
      }));
    }
    return null;
  }, [output?.filesWithValidation, output?.availableFiles]);

  // Create a stable signature for the files to track if we've opened the panel for this set
  const filesSignature = useMemo(() => {
    if (!filesWithValidation) {
      return null;
    }
    // Use count + first file ID as a simple stable signature
    const firstFileId = filesWithValidation[0]?.fileId || "";
    return `${filesWithValidation.length}:${firstFileId}`;
  }, [filesWithValidation]);

  // Calculate stats for the collapsed view
  const stats = useMemo(() => {
    if (!filesWithValidation) {
      return null;
    }
    const validCount = filesWithValidation.filter(
      (f) => f.fatturaValida
    ).length;
    return {
      valid: validCount,
      invalid: filesWithValidation.length - validCount,
      total: filesWithValidation.length,
    };
  }, [filesWithValidation]);

  // Auto-open the document selector panel when files are loaded
  useEffect(() => {
    // Skip if no files or we've already opened for this exact file set
    if (!filesWithValidation || !filesSignature) {
      return;
    }

    if (openedForSignatureRef.current === filesSignature) {
      return;
    }

    // Mark this file set as opened
    openedForSignatureRef.current = filesSignature;

    // Get bounding box for animation
    // Use a default center position if ref is not available
    const boundingBox = hitboxRef.current?.getBoundingClientRect() ?? {
      top: window.innerHeight / 4,
      left: window.innerWidth / 2,
      width: 300,
      height: 200,
    };

    // Open the document selector in the side panel
    setArtifact({
      documentId: "document-selector",
      kind: DOCUMENT_SELECTOR_KIND,
      content: filesWithValidation,
      title: "Documenti Disponibili",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: boundingBox.top,
        left: boundingBox.left,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    });
  }, [filesWithValidation, filesSignature, setArtifact]);

  // Handle click to re-open the panel
  const handleOpenPanel = useCallback(() => {
    if (!filesWithValidation) {
      return;
    }

    const boundingBox = hitboxRef.current?.getBoundingClientRect() ?? {
      top: window.innerHeight / 4,
      left: window.innerWidth / 2,
      width: 300,
      height: 200,
    };

    setArtifact({
      documentId: "document-selector",
      kind: DOCUMENT_SELECTOR_KIND,
      content: filesWithValidation,
      title: "Documenti Disponibili",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: boundingBox.top,
        left: boundingBox.left,
        width: boundingBox.width,
        height: boundingBox.height,
      },
    });
  }, [filesWithValidation, setArtifact]);

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

  // If filesWithValidation returned - show collapsed view with button to re-open panel
  if (filesWithValidation && stats) {
    // Show collapsed view when panel is open, or a clickable card to re-open
    return (
      <div ref={hitboxRef}>
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-all hover:bg-accent/50 hover:shadow-md"
          onClick={handleOpenPanel}
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
            <Files className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Documenti Disponibili
            </h3>
            <p className="text-muted-foreground text-xs">
              Clicca per aprire il pannello documenti
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              {stats.valid}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="size-3" />
              {stats.invalid}
            </span>
            <span className="text-muted-foreground">{stats.total} totali</span>
          </div>
        </button>
      </div>
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
 * Validation Badge Component
 */
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

/**
 * Invoice Details Component with Validation and Analysis
 *
 * When a new document is loaded, previous document widgets automatically collapse
 * to keep the interface clean. Only the "current" document shows full details
 * and the "Analizza Fattura" button.
 */
function InvoiceDetails({
  metadata,
  validation,
}: {
  metadata: NonNullable<LoadInvoiceOutput["metadata"]>;
  validation?: InvoiceValidationResult;
}) {
  const { chat } = useChatRuntime();
  const { activeDocumentId, setActiveDocument } = useActiveDocument();

  const isValid = validation?.fatturaValida ?? true;
  const hasMissingFields =
    validation?.campiMancanti && validation.campiMancanti.length > 0;
  const hasInvalidFields =
    validation?.campiNonValidi && validation.campiNonValidi.length > 0;

  // Determine if this widget is for the currently active document
  const isCurrentDocument = activeDocumentId === metadata.fileId;

  // Allow user to manually expand collapsed widgets
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  // Show full details if this is the current document OR if manually expanded
  const showFullDetails = isCurrentDocument || isManuallyExpanded;

  // Track if analysis was requested for the current invoice
  const lastFileIdRef = useRef(metadata.fileId);
  const [analysisRequested, setAnalysisRequested] = useState(false);

  // Set this document as active when first rendered
  // This ensures the most recently loaded document is always "current"
  useEffect(() => {
    setActiveDocument(metadata.fileId);
  }, [metadata.fileId, setActiveDocument]);

  // Reset analysis state when a different invoice is loaded
  if (lastFileIdRef.current !== metadata.fileId) {
    lastFileIdRef.current = metadata.fileId;
    if (analysisRequested) {
      setAnalysisRequested(false);
    }
  }

  // Reset manual expansion when this becomes the current document
  useEffect(() => {
    if (isCurrentDocument && isManuallyExpanded) {
      setIsManuallyExpanded(false);
    }
  }, [isCurrentDocument, isManuallyExpanded]);

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

  // Toggle expand/collapse for non-current documents
  const handleToggleExpand = useCallback(() => {
    if (!isCurrentDocument) {
      setIsManuallyExpanded((prev) => !prev);
    }
  }, [isCurrentDocument]);

  // Collapsed view for non-current documents
  if (!showFullDetails) {
    return (
      <button
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-left transition-all hover:bg-muted/50"
        onClick={handleToggleExpand}
        type="button"
      >
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            isValid
              ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {isValid ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-muted-foreground text-sm">
            {metadata.supplier || metadata.fileName}
          </p>
          <p className="truncate text-muted-foreground/70 text-xs">
            {metadata.invoiceNumber} • {metadata.date}
          </p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>
    );
  }

  // Full view for current document (or manually expanded)
  const headerContent = (
    <>
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
        <h3 className="font-semibold text-foreground">
          {isCurrentDocument ? "Documento Caricato" : "Documento precedente"}
        </h3>
        <p className="text-muted-foreground text-sm">{metadata.fileName}</p>
      </div>
      <div className="flex items-center gap-2">
        <ValidationBadge isValid={isValid} />
        {!isCurrentDocument && (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "rounded-xl border bg-background p-4 shadow-sm",
        isCurrentDocument
          ? "border-border"
          : "border-muted-foreground/30 border-dashed"
      )}
    >
      {/* Header - clickable button to collapse if not current, static div if current */}
      {isCurrentDocument ? (
        <div className="mb-4 flex items-center gap-3">{headerContent}</div>
      ) : (
        <button
          className="mb-4 flex w-full cursor-pointer items-center gap-3 text-left"
          onClick={handleToggleExpand}
          type="button"
        >
          {headerContent}
        </button>
      )}

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

      {/* Analyze Invoice Button - shown only for CURRENT invalid invoices with missing fields */}
      {isCurrentDocument && !isValid && hasMissingFields && (
        <div className="mt-4 flex justify-center">
          <Button
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            disabled={analysisRequested}
            onClick={handleAnalyze}
          >
            {analysisRequested ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                <span>Analisi richiesta...</span>
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" className="size-4" />
                <span>Analizza Fattura</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info for non-current documents */}
      {!isCurrentDocument && !isValid && hasMissingFields && (
        <div className="mt-4 flex justify-center">
          <p className="text-muted-foreground text-xs italic">
            Seleziona questo documento dal pannello per analizzarlo
          </p>
        </div>
      )}

      {/* Validation Details (when valid) */}
      {isValid && validation && (
        <div className="mt-4 border-border border-t pt-4">
          <p className="mb-2 font-medium text-emerald-700 text-sm dark:text-emerald-400">
            Tutti i campi obbligatori sono presenti e validi
          </p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs">
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
