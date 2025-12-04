import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget kinds - all supported widget types in the canvas
 */
export const WIDGET_KINDS = {
  // Document types (multi-instance)
  TEXT: "text",
  CODE: "code",
  SHEET: "sheet",
  // Media types (multi-instance)
  IMAGE: "image",
  // Viewer widgets (multi-instance)
  MARKDOWN_VIEWER: "markdown-viewer",
  // Selector widgets (single-instance)
  DOCUMENT_SELECTOR: "document-selector",
  // Video widgets (single-instance)
  VIDEO_LIBRARY: "video-library",
} as const;

export type WidgetKind = (typeof WIDGET_KINDS)[keyof typeof WIDGET_KINDS];

/**
 * Widget status during its lifecycle
 * - pending: Tab opened before document ID is known (waiting for stream to start)
 * - idle: Tab is ready and not actively streaming
 * - streaming: Content is being streamed to the tab
 * - error: An error occurred
 */
export type WidgetStatus = "pending" | "idle" | "streaming" | "error";

/**
 * Prefix used for pending document IDs before the real ID is known
 */
export const PENDING_DOC_PREFIX = "pending-";

/**
 * Check if a documentId is a pending ID (not yet bound to a real document)
 */
export function isPendingDocumentId(documentId: string): boolean {
  return documentId.startsWith(PENDING_DOC_PREFIX);
}

/**
 * Generate a pending document ID from a tool call ID
 */
export function generatePendingDocumentId(toolCallId: string): string {
  return `${PENDING_DOC_PREFIX}${toolCallId}`;
}

/**
 * Props passed to every widget renderer
 */
export type WidgetRendererProps<TContent = unknown, TMeta = unknown> = {
  /** Unique tab identifier */
  tabId: string;
  /** Document identifier (for persistence) */
  documentId: string;
  /** Widget title */
  title: string;
  /** Widget content */
  content: TContent;
  /** Current status */
  status: WidgetStatus;
  /** Optional metadata */
  meta?: TMeta;
  /** Callback to update content */
  onContentChange?: (content: TContent) => void;
  /** Callback to close the tab */
  onClose?: () => void;
  /** Additional className */
  className?: string;
};

/**
 * Widget definition registered in the registry
 */
export type WidgetDefinition<
  TKind extends WidgetKind = WidgetKind,
  TContent = unknown,
  TMeta = unknown,
> = {
  /** Unique widget kind identifier */
  kind: TKind;
  /** Human-readable label for the widget */
  label: string;
  /** Icon component for tabs and UI */
  icon: LucideIcon;
  /** The React component that renders this widget */
  renderer: ComponentType<WidgetRendererProps<TContent, TMeta>>;
  /** Whether multiple instances of this widget can be open */
  allowMultiple: boolean;
  /** Whether this widget supports streaming content */
  supportsStreaming: boolean;
  /** Default content when creating a new instance */
  defaultContent?: TContent;
  /** Optional color theme for the widget tab */
  tabColor?: {
    active: string;
    inactive: string;
    icon: string;
  };
};

/**
 * Tab data structure for canvas tabs
 */
export type CanvasTabData<TContent = unknown, TMeta = unknown> = {
  /** Unique tab identifier */
  id: string;
  /** Widget kind - determines which renderer to use */
  kind: WidgetKind;
  /** Document identifier (for persistence/streaming) */
  documentId: string;
  /** Tab title */
  title: string;
  /** Widget content */
  content: TContent;
  /** Current status */
  status: WidgetStatus;
  /** Creation timestamp */
  createdAt: number;
  /** Optional metadata */
  meta?: TMeta;
};

// ============================================================================
// WIDGET REGISTRY
// ============================================================================

/**
 * Widget Registry
 * Centralized registry for all canvas widget types.
 * Widgets must be registered before they can be used in tabs.
 */
class WidgetRegistry {
  private definitions = new Map<WidgetKind, WidgetDefinition>();

  /**
   * Register a widget definition
   */
  register<TKind extends WidgetKind, TContent = unknown, TMeta = unknown>(
    definition: WidgetDefinition<TKind, TContent, TMeta>
  ): void {
    if (this.definitions.has(definition.kind)) {
      console.warn(
        `[WidgetRegistry] Widget "${definition.kind}" is already registered. Overwriting.`
      );
    }
    this.definitions.set(
      definition.kind,
      definition as unknown as WidgetDefinition
    );
  }

  /**
   * Get a widget definition by kind
   */
  get<TKind extends WidgetKind>(
    kind: TKind
  ): WidgetDefinition<TKind> | undefined {
    return this.definitions.get(kind) as WidgetDefinition<TKind> | undefined;
  }

  /**
   * Check if a widget kind is registered
   */
  has(kind: WidgetKind): boolean {
    return this.definitions.has(kind);
  }

  /**
   * Get all registered widget definitions
   */
  getAll(): WidgetDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get the renderer component for a widget kind
   */
  getRenderer(
    kind: WidgetKind
  ): ComponentType<WidgetRendererProps> | undefined {
    return this.definitions.get(kind)?.renderer;
  }

  /**
   * Get the icon for a widget kind
   */
  getIcon(kind: WidgetKind): LucideIcon | undefined {
    return this.definitions.get(kind)?.icon;
  }

  /**
   * Check if a widget kind allows multiple instances
   */
  allowsMultiple(kind: WidgetKind): boolean {
    return this.definitions.get(kind)?.allowMultiple ?? true;
  }

  /**
   * Check if a widget kind supports streaming
   */
  supportsStreaming(kind: WidgetKind): boolean {
    return this.definitions.get(kind)?.supportsStreaming ?? false;
  }

  /**
   * Get the tab color theme for a widget kind
   */
  getTabColor(kind: WidgetKind): WidgetDefinition["tabColor"] | undefined {
    return this.definitions.get(kind)?.tabColor;
  }

  /**
   * Get the default content for a widget kind
   */
  getDefaultContent<T = unknown>(kind: WidgetKind): T | undefined {
    return this.definitions.get(kind)?.defaultContent as T | undefined;
  }
}

// Singleton instance
export const widgetRegistry = new WidgetRegistry();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a kind is a document type (text, code, sheet)
 */
export function isDocumentKind(kind: WidgetKind): boolean {
  return (
    kind === WIDGET_KINDS.TEXT ||
    kind === WIDGET_KINDS.CODE ||
    kind === WIDGET_KINDS.SHEET
  );
}

/**
 * Check if a kind is a media type (image)
 */
export function isMediaKind(kind: WidgetKind): boolean {
  return kind === WIDGET_KINDS.IMAGE;
}

/**
 * Check if a kind is a viewer type (markdown-viewer)
 */
export function isViewerKind(kind: WidgetKind): boolean {
  return kind === WIDGET_KINDS.MARKDOWN_VIEWER;
}

/**
 * Check if a kind is a selector widget (single-instance)
 */
export function isSelectorKind(kind: WidgetKind): boolean {
  return (
    kind === WIDGET_KINDS.DOCUMENT_SELECTOR ||
    kind === WIDGET_KINDS.VIDEO_LIBRARY
  );
}

/**
 * Get the category of a widget kind
 */
export function getWidgetCategory(
  kind: WidgetKind
): "document" | "media" | "viewer" | "selector" {
  if (isDocumentKind(kind)) {
    return "document";
  }
  if (isMediaKind(kind)) {
    return "media";
  }
  if (isViewerKind(kind)) {
    return "viewer";
  }
  return "selector";
}

/**
 * Generate a unique tab ID
 */
export function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
