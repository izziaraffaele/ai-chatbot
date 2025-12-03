"use client";

import {
  BookOpenText,
  Code2,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutGrid,
} from "lucide-react";
import { lazy, memo, Suspense } from "react";
import type { WidgetDefinition, WidgetRendererProps } from "./widget-registry";
import { WIDGET_KINDS, widgetRegistry } from "./widget-registry";

// ============================================================================
// LAZY-LOADED ARTIFACT COMPONENTS
// ============================================================================

// Document artifacts - lazy loaded for code splitting
const LazyDocumentArtifact = lazy(() =>
  import("@/components/artifacts/document").then((mod) => ({
    default: mod.DocumentArtifact,
  }))
);

const LazyMediaArtifact = lazy(() =>
  import("@/components/artifacts/media").then((mod) => ({
    default: mod.MediaArtifact,
  }))
);

const LazyDocumentSelectorArtifact = lazy(() =>
  import("@/components/artifacts/document-selector").then((mod) => ({
    default: mod.DocumentSelectorArtifact,
  }))
);

const LazyMarkdownViewerArtifact = lazy(() =>
  import("@/components/artifacts/markdown-viewer").then((mod) => ({
    default: mod.MarkdownViewerArtifact,
  }))
);

// ============================================================================
// LOADING FALLBACKS
// ============================================================================

function WidgetLoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        <span className="text-sm">Caricamento...</span>
      </div>
    </div>
  );
}

// ============================================================================
// WIDGET RENDERER ADAPTERS
// ============================================================================

/**
 * Adapter for Text Document widget
 */
const TextDocumentRenderer = memo(function TextDocumentRenderer({
  documentId,
  title,
  className,
}: WidgetRendererProps<string>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyDocumentArtifact
        className={className}
        documentId={documentId}
        kind="text"
        title={title}
      />
    </Suspense>
  );
});

/**
 * Adapter for Code Document widget
 */
const CodeDocumentRenderer = memo(function CodeDocumentRenderer({
  documentId,
  title,
  className,
}: WidgetRendererProps<string>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyDocumentArtifact
        className={className}
        documentId={documentId}
        kind="code"
        title={title}
      />
    </Suspense>
  );
});

/**
 * Adapter for Sheet Document widget
 */
const SheetDocumentRenderer = memo(function SheetDocumentRenderer({
  documentId,
  title,
  className,
}: WidgetRendererProps<string>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyDocumentArtifact
        className={className}
        documentId={documentId}
        kind="sheet"
        title={title}
      />
    </Suspense>
  );
});

/**
 * Adapter for Image Media widget
 */
const ImageMediaRenderer = memo(function ImageMediaRenderer({
  documentId,
  title,
  className,
}: WidgetRendererProps<string>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyMediaArtifact
        className={className}
        documentId={documentId}
        kind="image"
        title={title}
      />
    </Suspense>
  );
});

/**
 * Adapter for Document Selector widget
 */
const DocumentSelectorRenderer = memo(function DocumentSelectorRenderer({
  className,
}: WidgetRendererProps<unknown>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyDocumentSelectorArtifact className={className} />
    </Suspense>
  );
});

/**
 * Adapter for Markdown Viewer widget
 */
const MarkdownViewerRenderer = memo(function MarkdownViewerRenderer({
  content,
  title,
  className,
}: WidgetRendererProps<string>) {
  return (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyMarkdownViewerArtifact
        className={className}
        content={content}
        title={title}
      />
    </Suspense>
  );
});

// ============================================================================
// WIDGET DEFINITIONS
// ============================================================================

/**
 * Text Document Widget Definition
 */
export const textWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.TEXT,
  string
> = {
  kind: WIDGET_KINDS.TEXT,
  label: "Documento di testo",
  icon: FileText,
  renderer: TextDocumentRenderer,
  allowMultiple: true,
  supportsStreaming: true,
  defaultContent: "",
  tabColor: {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-muted/50 text-muted-foreground border-border/50",
    icon: "text-white",
  },
};

/**
 * Code Document Widget Definition
 */
export const codeWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.CODE,
  string
> = {
  kind: WIDGET_KINDS.CODE,
  label: "Codice",
  icon: Code2,
  renderer: CodeDocumentRenderer,
  allowMultiple: true,
  supportsStreaming: true,
  defaultContent: "",
  tabColor: {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-muted/50 text-muted-foreground border-border/50",
    icon: "text-white",
  },
};

/**
 * Sheet Document Widget Definition
 */
export const sheetWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.SHEET,
  string
> = {
  kind: WIDGET_KINDS.SHEET,
  label: "Foglio di calcolo",
  icon: FileSpreadsheet,
  renderer: SheetDocumentRenderer,
  allowMultiple: true,
  supportsStreaming: true,
  defaultContent: "",
  tabColor: {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-muted/50 text-muted-foreground border-border/50",
    icon: "text-white",
  },
};

/**
 * Image Media Widget Definition
 */
export const imageWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.IMAGE,
  string
> = {
  kind: WIDGET_KINDS.IMAGE,
  label: "Immagine",
  icon: Image,
  renderer: ImageMediaRenderer,
  allowMultiple: true,
  supportsStreaming: false,
  defaultContent: "",
  tabColor: {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-muted/50 text-muted-foreground border-border/50",
    icon: "text-white",
  },
};

/**
 * Document Selector Widget Definition
 */
export const documentSelectorWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.DOCUMENT_SELECTOR,
  unknown
> = {
  kind: WIDGET_KINDS.DOCUMENT_SELECTOR,
  label: "Selettore documenti",
  icon: LayoutGrid,
  renderer: DocumentSelectorRenderer,
  allowMultiple: false,
  supportsStreaming: false,
  defaultContent: [],
  tabColor: {
    active: "bg-emerald-500 text-white border-emerald-500",
    inactive: "bg-muted text-muted-foreground border-border",
    icon: "text-white",
  },
};

/**
 * Markdown Viewer Widget Definition
 * Rich markdown viewer with TOC sidebar, progress bar, and styled elements
 */
export const markdownViewerWidgetDefinition: WidgetDefinition<
  typeof WIDGET_KINDS.MARKDOWN_VIEWER,
  string
> = {
  kind: WIDGET_KINDS.MARKDOWN_VIEWER,
  label: "Visualizzatore Markdown",
  icon: BookOpenText,
  renderer: MarkdownViewerRenderer,
  allowMultiple: true,
  supportsStreaming: false,
  defaultContent: "",
  tabColor: {
    active: "bg-orange-500 text-white border-orange-500",
    inactive: "bg-muted/50 text-muted-foreground border-border/50",
    icon: "text-white",
  },
};

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register all built-in widgets in the registry.
 * Call this function during app initialization.
 */
export function registerBuiltInWidgets(): void {
  widgetRegistry.register(textWidgetDefinition);
  widgetRegistry.register(codeWidgetDefinition);
  widgetRegistry.register(sheetWidgetDefinition);
  widgetRegistry.register(imageWidgetDefinition);
  widgetRegistry.register(markdownViewerWidgetDefinition);
  widgetRegistry.register(documentSelectorWidgetDefinition);
}

/**
 * All built-in widget definitions
 */
export const builtInWidgetDefinitions = [
  textWidgetDefinition,
  codeWidgetDefinition,
  sheetWidgetDefinition,
  imageWidgetDefinition,
  markdownViewerWidgetDefinition,
  documentSelectorWidgetDefinition,
];
