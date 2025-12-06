"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Code2,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutGrid,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
  type CanvasTab,
  type CanvasTabType,
  getWidgetKindForArtifact,
  useCanvasTabs,
} from "@/hooks/use-canvas-tabs";
import { WIDGET_KINDS, type WidgetKind, widgetRegistry } from "@/lib/canvas";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export type CanvasTabsProps = {
  className?: string;
};

export type CanvasTabItemProps = {
  tab: CanvasTab;
  isActive: boolean;
  tabIndex: number;
  totalTabs: number;
  onSelect: () => void;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next" | "first" | "last") => void;
};

// ============================================================================
// FALLBACK ICONS (used when widget not registered)
// ============================================================================

const FALLBACK_ICONS: Record<
  CanvasTabType,
  React.ComponentType<{ className?: string }>
> = {
  widget: LayoutGrid,
  document: FileText,
  csv: FileSpreadsheet,
};

const WIDGET_KIND_ICONS: Record<
  WidgetKind,
  React.ComponentType<{ className?: string }>
> = {
  [WIDGET_KINDS.DOCUMENT_SELECTOR]: LayoutGrid,
  [WIDGET_KINDS.TEXT]: FileText,
  [WIDGET_KINDS.CODE]: Code2,
  [WIDGET_KINDS.SHEET]: FileSpreadsheet,
  [WIDGET_KINDS.IMAGE]: Image,
};

// ============================================================================
// COLORS - Memoraiz Palette
// ============================================================================

const TAB_COLORS = {
  active: "bg-hf-cyan text-white border-hf-cyan",
  pending: "bg-hf-cyan/80 text-white border-hf-cyan animate-pulse",
  inactive:
    "bg-hf-cyan/5 text-hf-deep-blue/70 border-hf-cyan/20 hover:bg-hf-cyan/10",
  iconActive: "text-white",
  iconPending: "text-white",
  iconInactive: "text-hf-cyan",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the icon for a tab based on widget registry or fallback
 */
function getTabIcon(
  tab: CanvasTab
): React.ComponentType<{ className?: string }> {
  const widgetKind = getWidgetKindForArtifact(tab.artifact.kind);

  // Try registry first
  const registeredIcon = widgetRegistry.getIcon(widgetKind);
  if (registeredIcon) {
    return registeredIcon;
  }

  // Fallback to widget kind map
  if (widgetKind in WIDGET_KIND_ICONS) {
    return WIDGET_KIND_ICONS[widgetKind];
  }

  // Final fallback to tab type
  return FALLBACK_ICONS[tab.type] || FileText;
}

/**
 * Get the label for a tab (for accessibility)
 */
function getTabLabel(tab: CanvasTab): string {
  const widgetKind = getWidgetKindForArtifact(tab.artifact.kind);
  const definition = widgetRegistry.get(widgetKind);
  return definition?.label || tab.type;
}

// ============================================================================
// CANVAS TABS CONTAINER
// ============================================================================

/**
 * CanvasTabs
 * Accessible horizontal tab bar for the canvas panel with browser-style tabs.
 * Supports keyboard navigation (Arrow keys, Home, End, Delete).
 */
export function CanvasTabs({ className }: CanvasTabsProps) {
  const { tabs, activeTabId, switchTab, closeTab } = useCanvasTabs();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Focus the active tab when it changes
  useEffect(() => {
    if (activeTabId) {
      const activeTabElement = tabRefs.current.get(activeTabId);
      if (
        activeTabElement &&
        document.activeElement?.closest('[role="tablist"]')
      ) {
        activeTabElement.focus();
      }
    }
  }, [activeTabId]);

  const handleSelect = useCallback(
    (tabId: string) => {
      switchTab(tabId);
    },
    [switchTab]
  );

  const handleNavigate = useCallback(
    (direction: "prev" | "next" | "first" | "last") => {
      if (tabs.length === 0) {
        return;
      }

      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      let newIndex: number;

      switch (direction) {
        case "prev":
          newIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
          break;
        case "next":
          newIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
          break;
        case "first":
          newIndex = 0;
          break;
        case "last":
          newIndex = tabs.length - 1;
          break;
      }

      const targetTab = tabs[newIndex];
      if (targetTab) {
        switchTab(targetTab.id);
        tabRefs.current.get(targetTab.id)?.focus();
      }
    },
    [tabs, activeTabId, switchTab]
  );

  const handleClose = useCallback(
    (tabId: string) => {
      closeTab(tabId);
    },
    [closeTab]
  );

  // Handle wheel event to enable horizontal scrolling with vertical mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Register tab ref
  const setTabRef = useCallback(
    (tabId: string, element: HTMLDivElement | null) => {
      if (element) {
        tabRefs.current.set(tabId, element);
      } else {
        tabRefs.current.delete(tabId);
      }
    },
    []
  );

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Pannelli aperti"
      className={cn(
        "flex w-full items-end gap-1 overflow-x-auto border-border border-b bg-background px-2 pt-2",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20",
        className
      )}
      data-slot="canvas-tabs"
      onWheel={handleWheel}
      ref={scrollContainerRef}
      role="tablist"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {tabs.map((tab, index) => (
          <CanvasTabItem
            isActive={tab.id === activeTabId}
            key={tab.id}
            onClose={() => handleClose(tab.id)}
            onNavigate={handleNavigate}
            onSelect={() => handleSelect(tab.id)}
            ref={(el) => setTabRef(tab.id, el)}
            tab={tab}
            tabIndex={index}
            totalTabs={tabs.length}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// CANVAS TAB ITEM
// ============================================================================

import { forwardRef } from "react";

/**
 * CanvasTabItem
 * Individual tab with icon, title, close button, and full keyboard support.
 */
const CanvasTabItem = forwardRef<HTMLDivElement, CanvasTabItemProps>(
  function CanvasTabItem(
    { tab, isActive, tabIndex, totalTabs, onSelect, onClose, onNavigate },
    ref
  ) {
    const Icon = getTabIcon(tab);
    const label = getTabLabel(tab);
    const isPending = tab.artifact.status === "pending";

    // Determine tab colors based on state
    const getTabColorClass = () => {
      if (isPending) return TAB_COLORS.pending;
      if (isActive) return TAB_COLORS.active;
      return TAB_COLORS.inactive;
    };

    const getIconColorClass = () => {
      if (isPending) return TAB_COLORS.iconPending;
      if (isActive) return TAB_COLORS.iconActive;
      return TAB_COLORS.iconInactive;
    };

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            onNavigate("prev");
            break;
          case "ArrowRight":
            e.preventDefault();
            onNavigate("next");
            break;
          case "Home":
            e.preventDefault();
            onNavigate("first");
            break;
          case "End":
            e.preventDefault();
            onNavigate("last");
            break;
          case "Delete":
          case "Backspace":
            e.preventDefault();
            onClose();
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            onSelect();
            break;
        }
      },
      [onNavigate, onClose, onSelect]
    );

    // Handle middle-click to close tab
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 1) {
          // Middle mouse button
          e.preventDefault();
          onClose();
        }
      },
      [onClose]
    );

    return (
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        aria-controls={`tabpanel-${tab.id}`}
        aria-posinset={tabIndex + 1}
        aria-selected={isActive}
        aria-setsize={totalTabs}
        className={cn(
          "group relative flex min-w-0 max-w-[200px] shrink-0 cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-left outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-hf-cyan focus-visible:ring-offset-1",
          getTabColorClass(),
          (isActive || isPending) && "z-10"
        )}
        exit={{ opacity: 0, scale: 0.8 }}
        id={`tab-${tab.id}`}
        initial={{ opacity: 0, scale: 0.9 }}
        layout="position"
        layoutId={`tab-${tab.id}`}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        ref={ref}
        role="tab"
        tabIndex={isActive ? 0 : -1}
        transition={{
          layout: { type: "spring", stiffness: 500, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
      >
        {/* Tab Icon */}
        <Icon
          aria-hidden="true"
          className={cn("size-4 shrink-0", getIconColorClass())}
        />

        {/* Tab Title */}
        <span className="truncate font-medium text-sm">
          {tab.artifact.status === "pending" ? "Preparing..." : tab.title}
        </span>

        {/* Status indicator for pending */}
        {tab.artifact.status === "pending" && (
          <span
            aria-label="Preparazione in corso"
            className="relative flex size-2 shrink-0"
          >
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-hf-cyan-light opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-hf-cyan" />
          </span>
        )}

        {/* Status indicator for streaming */}
        {tab.artifact.status === "streaming" && (
          <span
            aria-label="Caricamento in corso"
            className="size-2 shrink-0 animate-pulse rounded-full bg-hf-yellow"
          />
        )}

        {/* Close Button */}
        <button
          aria-label={`Chiudi ${label}: ${tab.title}`}
          className={cn(
            "ml-1 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-hf-cyan",
            isActive || isPending
              ? "hover:bg-black/10 dark:hover:bg-white/20"
              : "opacity-0 hover:bg-hf-cyan/20 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          tabIndex={-1}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>

        {/* Active/Pending Tab Bottom Border Cover */}
        {(isActive || isPending) && (
          <div
            aria-hidden="true"
            className="-bottom-px absolute right-0 left-0 h-px bg-background dark:bg-muted"
          />
        )}
      </motion.div>
    );
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export { CanvasTabItem };
