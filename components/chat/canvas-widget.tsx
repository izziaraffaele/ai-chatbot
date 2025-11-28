"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { Suspense, useCallback, useMemo } from "react";
import {
  type CanvasTabData,
  WidgetContextProvider,
  type WidgetKind,
  type WidgetStatus,
  widgetRegistry,
} from "@/lib/canvas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type CanvasWidgetContainerProps = {
  /** Tab data containing widget info */
  tab: CanvasTabData;
  /** Callback when content changes */
  onContentChange?: (tabId: string, content: unknown) => void;
  /** Callback when status changes */
  onStatusChange?: (tabId: string, status: WidgetStatus) => void;
  /** Callback to close the tab */
  onClose: (tabId: string) => void;
  /** Callback when title changes */
  onTitleChange?: (tabId: string, title: string) => void;
  /** Additional className */
  className?: string;
};

// ============================================================================
// LOADING FALLBACK
// ============================================================================

function WidgetLoadingFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8",
        className
      )}
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground text-sm">Caricamento widget...</p>
    </div>
  );
}

// ============================================================================
// ERROR FALLBACK
// ============================================================================

function WidgetErrorFallback({
  kind,
  error,
  className,
}: {
  kind: WidgetKind;
  error?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
        <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground">
          Widget non disponibile
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          {error || `Impossibile caricare il widget di tipo "${kind}"`}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// UNREGISTERED WIDGET FALLBACK
// ============================================================================

function UnregisteredWidgetFallback({
  kind,
  className,
}: {
  kind: WidgetKind;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
        <AlertCircle className="size-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground">Widget non registrato</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Il widget di tipo "{kind}" non è stato registrato nel sistema.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CANVAS WIDGET CONTAINER
// ============================================================================

/**
 * CanvasWidgetContainer
 *
 * Generic container that renders any widget type based on the registry.
 * Provides per-tab context and handles loading/error states.
 *
 * @example
 * ```tsx
 * <CanvasWidgetContainer
 *   tab={activeTab}
 *   onContentChange={(tabId, content) => updateTabContent(tabId, content)}
 *   onClose={(tabId) => closeTab(tabId)}
 * />
 * ```
 */
export function CanvasWidgetContainer({
  tab,
  onContentChange,
  onStatusChange,
  onClose,
  onTitleChange,
  className,
}: CanvasWidgetContainerProps) {
  // Get the widget definition from registry
  const widgetDefinition = useMemo(
    () => widgetRegistry.get(tab.kind),
    [tab.kind]
  );

  // Create bound callbacks
  const handleContentChange = useCallback(
    (content: unknown) => {
      onContentChange?.(tab.id, content);
    },
    [tab.id, onContentChange]
  );

  const handleStatusChange = useCallback(
    (status: WidgetStatus) => {
      onStatusChange?.(tab.id, status);
    },
    [tab.id, onStatusChange]
  );

  const handleClose = useCallback(() => {
    onClose(tab.id);
  }, [tab.id, onClose]);

  const handleTitleChange = useCallback(
    (title: string) => {
      onTitleChange?.(tab.id, title);
    },
    [tab.id, onTitleChange]
  );

  // Handle unregistered widget
  if (!widgetDefinition) {
    return <UnregisteredWidgetFallback className={className} kind={tab.kind} />;
  }

  // Handle error status
  if (tab.status === "error") {
    return (
      <WidgetErrorFallback
        className={className}
        error={tab.meta?.error as string | undefined}
        kind={tab.kind}
      />
    );
  }

  const WidgetRenderer = widgetDefinition.renderer;

  // Note: AnimatePresence with mode="wait" can cause delays in content updates.
  // We use mode="sync" to ensure content updates are immediately visible.
  return (
    <AnimatePresence mode="sync">
      <motion.div
        animate={{ opacity: 1 }}
        className={cn("flex h-full w-full flex-col", className)}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        key={tab.id}
        transition={{ duration: 0.1 }}
      >
        <WidgetContextProvider
          content={tab.content}
          documentId={tab.documentId}
          kind={tab.kind}
          meta={tab.meta}
          onClose={handleClose}
          onContentChange={handleContentChange}
          onStatusChange={handleStatusChange}
          onTitleChange={handleTitleChange}
          status={tab.status}
          tabId={tab.id}
          title={tab.title}
        >
          <Suspense fallback={<WidgetLoadingFallback className={className} />}>
            <WidgetRenderer
              className={className}
              content={tab.content}
              documentId={tab.documentId}
              meta={tab.meta}
              onClose={handleClose}
              onContentChange={handleContentChange}
              status={tab.status}
              tabId={tab.id}
              title={tab.title}
            />
          </Suspense>
        </WidgetContextProvider>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// TAB PANEL WRAPPER (for accessibility)
// ============================================================================

export type CanvasTabPanelProps = {
  /** Tab ID for aria-labelledby */
  tabId: string;
  /** Whether this panel is active */
  isActive: boolean;
  /** Children content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
};

/**
 * CanvasTabPanel
 * Accessible wrapper for tab panel content with proper ARIA attributes.
 */
export function CanvasTabPanel({
  tabId,
  isActive,
  children,
  className,
}: CanvasTabPanelProps) {
  return (
    <div
      aria-labelledby={`tab-${tabId}`}
      className={cn(
        "flex h-full w-full flex-col",
        !isActive && "hidden",
        className
      )}
      hidden={!isActive}
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      tabIndex={isActive ? 0 : -1}
    >
      {children}
    </div>
  );
}
