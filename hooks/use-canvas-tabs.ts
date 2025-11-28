"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import type { UIArtifact } from "@/components/chat/artifact";
import {
  type CanvasTabData,
  generatePendingDocumentId,
  generateTabId,
  isPendingDocumentId,
  WIDGET_KINDS,
  type WidgetKind,
  type WidgetStatus,
  widgetRegistry,
} from "@/lib/canvas";

// ============================================================================
// TYPES
// ============================================================================

/**
 * @deprecated Use WidgetKind from lib/canvas instead
 * Tab types that determine behavior and rendering
 */
export type CanvasTabType = "widget" | "document" | "csv";

/**
 * Individual tab data structure
 * Now uses the new CanvasTabData from widget registry internally
 */
export type CanvasTab = {
  id: string;
  type: CanvasTabType;
  title: string;
  artifact: UIArtifact;
  createdAt: number;
};

/**
 * Complete tabs state
 */
export type CanvasTabsState = {
  tabs: CanvasTab[];
  activeTabId: string | null;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const CANVAS_TABS_KEY = "canvas-tabs";

const initialTabsState: CanvasTabsState = {
  tabs: [],
  activeTabId: null,
};

// ============================================================================
// DIRECT MUTATION FUNCTIONS (for streaming sync)
// ============================================================================

// Internal cache reference for early-exit optimization
let _cachedTabsState: CanvasTabsState | null = null;

/**
 * Internal function to peek at the current cache state without triggering mutations.
 * Uses a side-effect-free pattern to read from SWR cache.
 */
function peekTabsState(): CanvasTabsState {
  if (_cachedTabsState !== null) {
    return _cachedTabsState;
  }
  // Fallback: read from globalMutate (synchronous read)
  let currentState = initialTabsState;
  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      currentState = current || initialTabsState;
      return current; // Return unchanged to avoid triggering updates
    },
    { revalidate: false }
  );
  return currentState;
}

/**
 * Updates the internal cache reference. Called after mutations.
 * This allows peekTabsState to return accurate data without additional reads.
 */
function updateCacheReference(state: CanvasTabsState) {
  _cachedTabsState = state;
}

/**
 * Directly mutates tab state by documentId without requiring hook context.
 * This is used by useTabStreamSync to synchronize streaming data to tabs.
 *
 * Performance optimization: Early-exits if no tabs exist or no matching documentId.
 *
 * @returns true if a tab was found and updated, false otherwise
 */
export function mutateTabByDocumentId(
  documentId: string,
  updates: {
    content?: unknown;
    status?: WidgetStatus;
    title?: string;
  }
): boolean {
  // Early-exit: Check if there are any tabs at all
  const cachedState = peekTabsState();
  if (cachedState.tabs.length === 0) {
    return false;
  }

  // Early-exit: Check if any tab has this documentId
  const hasMatchingTab = cachedState.tabs.some(
    (tab) => tab.artifact.documentId === documentId
  );
  if (!hasMatchingTab) {
    return false;
  }

  let didUpdate = false;

  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      const currentState = current || initialTabsState;

      // Double-check (state may have changed since peek)
      const matchingTab = currentState.tabs.find(
        (tab) => tab.artifact.documentId === documentId
      );

      if (!matchingTab) {
        return currentState;
      }

      didUpdate = true;

      const newState = {
        ...currentState,
        tabs: currentState.tabs.map((tab) => {
          if (tab.artifact.documentId !== documentId) {
            return tab;
          }

          const updatedArtifact = { ...tab.artifact };

          if (updates.content !== undefined) {
            updatedArtifact.content = updates.content;
          }
          if (updates.status !== undefined) {
            updatedArtifact.status = updates.status;
          }
          if (updates.title !== undefined) {
            updatedArtifact.title = updates.title;
          }

          return {
            ...tab,
            title: updates.title ?? tab.title,
            artifact: updatedArtifact,
          };
        }),
      };

      // Update cache reference for future early-exits
      updateCacheReference(newState);

      return newState;
    },
    { revalidate: false }
  );

  return didUpdate;
}

/**
 * Gets the current tabs state directly from SWR cache.
 * Used for checking tab existence during streaming.
 */
export function getTabsState(): CanvasTabsState {
  // Access current cache state synchronously
  // This is a simple way to get current state without subscribing
  let currentState = initialTabsState;
  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      currentState = current || initialTabsState;
      return current; // Return unchanged
    },
    { revalidate: false }
  );
  return currentState;
}

// ============================================================================
// PENDING TAB FUNCTIONS (for immediate tab opening before document ID is known)
// ============================================================================

/**
 * Opens a pending tab immediately using toolCallId as temporary identifier.
 * Called when a document tool starts executing but before the real document ID is available.
 *
 * @param toolCallId - The tool call ID used as temporary identifier
 * @param kind - The widget kind (text, code, sheet, etc.)
 * @param title - The initial title for the tab
 * @returns The pending document ID (pending-{toolCallId})
 */
export function openPendingTab(
  toolCallId: string,
  kind: WidgetKind,
  title: string
): string {
  const pendingDocId = generatePendingDocumentId(toolCallId);
  const tabType = ARTIFACT_KIND_TO_TAB_TYPE[kind] || "document";

  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      const currentState = current || initialTabsState;

      // Check if a pending tab with this ID already exists
      const existingPendingTab = currentState.tabs.find(
        (tab) => tab.artifact.documentId === pendingDocId
      );

      if (existingPendingTab) {
        // Just activate it
        const newState = {
          ...currentState,
          activeTabId: existingPendingTab.id,
        };
        updateCacheReference(newState);
        return newState;
      }

      // Create new pending tab
      const newTab: CanvasTab = {
        id: generateTabId(),
        type: tabType,
        title,
        artifact: {
          documentId: pendingDocId,
          kind,
          content: "",
          title,
          status: "pending",
          isVisible: true,
          boundingBox: { top: 0, left: 0, width: 0, height: 0 },
        },
        createdAt: Date.now(),
      };

      const newState = {
        tabs: [...currentState.tabs, newTab],
        activeTabId: newTab.id,
      };

      // Update cache reference for immediate visibility
      updateCacheReference(newState);

      return newState;
    },
    { revalidate: false }
  );

  return pendingDocId;
}

/**
 * Binds a pending tab to an actual document ID.
 * Called when the data-id stream event arrives with the real document ID.
 *
 * IMPORTANT: This function updates the cache reference after mutation
 * to ensure subsequent calls to peekTabsState() and mutateTabByDocumentId()
 * see the updated documentId. This is critical for multiple document streaming.
 *
 * @param pendingDocId - The pending document ID (pending-{toolCallId})
 * @param actualDocId - The real document ID from the backend
 * @returns true if a pending tab was found and bound, false otherwise
 */
export function bindPendingTabToDocument(
  pendingDocId: string,
  actualDocId: string
): boolean {
  let didBind = false;

  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      const currentState = current || initialTabsState;

      // Find the pending tab
      const pendingTabIndex = currentState.tabs.findIndex(
        (tab) => tab.artifact.documentId === pendingDocId
      );

      if (pendingTabIndex === -1) {
        return currentState;
      }

      didBind = true;

      // Update the tab's documentId and status
      const updatedTabs = [...currentState.tabs];
      updatedTabs[pendingTabIndex] = {
        ...updatedTabs[pendingTabIndex],
        artifact: {
          ...updatedTabs[pendingTabIndex].artifact,
          documentId: actualDocId,
          status: "streaming",
        },
      };

      const newState = {
        ...currentState,
        tabs: updatedTabs,
      };

      // Update cache reference so subsequent peekTabsState() calls
      // see the updated documentId immediately
      updateCacheReference(newState);

      return newState;
    },
    { revalidate: false }
  );

  return didBind;
}

/**
 * Finds the first pending tab in the current state.
 * Used to check if there's a pending tab waiting for a document ID.
 *
 * @returns The pending tab or null if none exists
 * @deprecated Use findMostRecentPendingTab for better multi-document support
 */
export function findPendingTab(): CanvasTab | null {
  const state = getTabsState();
  return (
    state.tabs.find((tab) => isPendingDocumentId(tab.artifact.documentId)) ||
    null
  );
}

/**
 * Finds the most recently created pending tab in the current state.
 * This is critical for multiple document streaming - when creating
 * documents in sequence, we need to bind the NEWEST pending tab,
 * not just any pending tab.
 *
 * @returns The most recently created pending tab, or null if none exists
 */
export function findMostRecentPendingTab(): CanvasTab | null {
  const state = getTabsState();
  const pendingTabs = state.tabs.filter((tab) =>
    isPendingDocumentId(tab.artifact.documentId)
  );

  if (pendingTabs.length === 0) {
    return null;
  }

  // Sort by createdAt descending (newest first) and return the first one
  return pendingTabs.reduce((newest, tab) =>
    tab.createdAt > newest.createdAt ? tab : newest
  );
}

/**
 * Finds a pending tab by its pending document ID.
 *
 * @param pendingDocId - The pending document ID to search for
 * @returns The pending tab or null if not found
 */
export function findPendingTabById(pendingDocId: string): CanvasTab | null {
  const state = getTabsState();
  return (
    state.tabs.find((tab) => tab.artifact.documentId === pendingDocId) || null
  );
}

/**
 * Resets all tabs that are in "streaming" or "pending" status to "idle".
 * This is a defensive fallback to prevent tabs from getting stuck in
 * generating state if stream events are missed or arrive out of order.
 *
 * @returns The number of tabs that were reset
 */
export function resetAllStreamingTabs(): number {
  let resetCount = 0;

  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      const currentState = current || initialTabsState;

      // Find tabs that need resetting
      const needsReset = currentState.tabs.some(
        (tab) =>
          tab.artifact.status === "streaming" ||
          tab.artifact.status === "pending"
      );

      if (!needsReset) {
        return currentState;
      }

      return {
        ...currentState,
        tabs: currentState.tabs.map((tab) => {
          if (
            tab.artifact.status === "streaming" ||
            tab.artifact.status === "pending"
          ) {
            resetCount++;
            return {
              ...tab,
              artifact: {
                ...tab.artifact,
                status: "idle" as const,
              },
            };
          }
          return tab;
        }),
      };
    },
    { revalidate: false }
  );

  return resetCount;
}

/**
 * Activates an existing tab by document ID and sets its status to streaming.
 * Used for updateDocument when the tab already exists.
 *
 * @param documentId - The document ID to activate
 * @returns true if the tab was found and activated, false otherwise
 */
export function activateTabForStreaming(documentId: string): boolean {
  let didActivate = false;

  globalMutate<CanvasTabsState>(
    CANVAS_TABS_KEY,
    (current) => {
      const currentState = current || initialTabsState;

      // Find the tab with this documentId
      const tabIndex = currentState.tabs.findIndex(
        (tab) => tab.artifact.documentId === documentId
      );

      if (tabIndex === -1) {
        return currentState;
      }

      didActivate = true;

      // Update status to streaming and activate
      const updatedTabs = [...currentState.tabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        artifact: {
          ...updatedTabs[tabIndex].artifact,
          status: "streaming",
        },
      };

      return {
        tabs: updatedTabs,
        activeTabId: updatedTabs[tabIndex].id,
      };
    },
    { revalidate: false }
  );

  return didActivate;
}

/**
 * Maps artifact kinds to tab types (legacy compatibility)
 */
export const ARTIFACT_KIND_TO_TAB_TYPE: Record<string, CanvasTabType> = {
  // Widget tabs (single-instance)
  "document-selector": "widget",
  // Document tabs (multi-instance)
  text: "document",
  code: "document",
  sheet: "document",
  // CSV tabs (multi-instance)
  csv: "csv",
  // Media tabs (multi-instance)
  image: "document",
};

/**
 * Maps artifact kinds to widget kinds
 */
const ARTIFACT_KIND_TO_WIDGET_KIND: Record<string, WidgetKind> = {
  "document-selector": WIDGET_KINDS.DOCUMENT_SELECTOR,
  text: WIDGET_KINDS.TEXT,
  code: WIDGET_KINDS.CODE,
  sheet: WIDGET_KINDS.SHEET,
  image: WIDGET_KINDS.IMAGE,
};

/**
 * Tab types that only allow single instances
 */
const SINGLE_INSTANCE_TAB_TYPES: CanvasTabType[] = ["widget"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets the tab type for an artifact kind
 */
export function getTabTypeForArtifact(kind: string): CanvasTabType {
  return ARTIFACT_KIND_TO_TAB_TYPE[kind] || "document";
}

/**
 * Gets the widget kind for an artifact kind
 */
export function getWidgetKindForArtifact(kind: string): WidgetKind {
  return ARTIFACT_KIND_TO_WIDGET_KIND[kind] || WIDGET_KINDS.TEXT;
}

/**
 * Checks if a tab type allows multiple instances
 */
export function allowsMultipleInstances(tabType: CanvasTabType): boolean {
  return !SINGLE_INSTANCE_TAB_TYPES.includes(tabType);
}

/**
 * Checks if a widget kind allows multiple instances using the registry
 */
export function widgetAllowsMultiple(kind: WidgetKind): boolean {
  return widgetRegistry.allowsMultiple(kind);
}

/**
 * Convert CanvasTab to CanvasTabData
 */
function tabToTabData(tab: CanvasTab): CanvasTabData {
  return {
    id: tab.id,
    kind: getWidgetKindForArtifact(tab.artifact.kind),
    documentId: tab.artifact.documentId,
    title: tab.title,
    content: tab.artifact.content,
    status: tab.artifact.status,
    createdAt: tab.createdAt,
    meta: undefined,
  };
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useCanvasTabs Hook
 *
 * Manages multi-tab state for the canvas panel.
 * Supports opening, closing, switching, and reordering tabs.
 * Enforces single-instance rules for widget tabs using the registry.
 */
export function useCanvasTabs() {
  const { data: tabsState, mutate: setTabsState } = useSWR<CanvasTabsState>(
    CANVAS_TABS_KEY,
    null,
    { fallbackData: initialTabsState }
  );

  const state = useMemo(() => tabsState || initialTabsState, [tabsState]);

  /**
   * Opens a new tab or activates an existing one
   * For single-instance tab types, replaces the existing tab
   */
  const openTab = useCallback(
    (artifact: UIArtifact, title: string) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;
        const tabType = getTabTypeForArtifact(artifact.kind);
        const widgetKind = getWidgetKindForArtifact(artifact.kind);

        // Check registry first, fallback to legacy check
        const allowsMultiple = widgetRegistry.has(widgetKind)
          ? widgetRegistry.allowsMultiple(widgetKind)
          : allowsMultipleInstances(tabType);

        // For single-instance tabs, check if one already exists
        if (!allowsMultiple) {
          const existingTabIndex = currentState.tabs.findIndex(
            (tab) => tab.type === tabType
          );

          if (existingTabIndex !== -1) {
            // Replace the existing tab's artifact and activate it
            const updatedTabs = [...currentState.tabs];
            updatedTabs[existingTabIndex] = {
              ...updatedTabs[existingTabIndex],
              title,
              artifact,
            };
            return {
              tabs: updatedTabs,
              activeTabId: updatedTabs[existingTabIndex].id,
            };
          }
        }

        // Check if a tab with the same documentId already exists (for documents)
        const existingDocTab = currentState.tabs.find(
          (tab) =>
            tab.artifact.documentId === artifact.documentId &&
            tab.type === tabType
        );

        if (existingDocTab) {
          // Activate the existing tab and update its artifact
          return {
            tabs: currentState.tabs.map((tab) =>
              tab.id === existingDocTab.id ? { ...tab, title, artifact } : tab
            ),
            activeTabId: existingDocTab.id,
          };
        }

        // Create a new tab
        const newTab: CanvasTab = {
          id: generateTabId(),
          type: tabType,
          title,
          artifact,
          createdAt: Date.now(),
        };

        return {
          tabs: [...currentState.tabs, newTab],
          activeTabId: newTab.id,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Opens a new tab using the new CanvasTabData format
   * This is the preferred method for new code
   */
  const openTabWithData = useCallback(
    (tabData: Omit<CanvasTabData, "id" | "createdAt">) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        // Check if widget allows multiple instances
        const allowsMultiple = widgetRegistry.has(tabData.kind)
          ? widgetRegistry.allowsMultiple(tabData.kind)
          : true;

        // For single-instance widgets, check if one already exists
        if (!allowsMultiple) {
          const existingTabIndex = currentState.tabs.findIndex(
            (tab) =>
              getWidgetKindForArtifact(tab.artifact.kind) === tabData.kind
          );

          if (existingTabIndex !== -1) {
            // Replace the existing tab and activate it
            const updatedTabs = [...currentState.tabs];
            updatedTabs[existingTabIndex] = {
              ...updatedTabs[existingTabIndex],
              title: tabData.title,
              artifact: {
                ...updatedTabs[existingTabIndex].artifact,
                documentId: tabData.documentId,
                kind: tabData.kind,
                content: tabData.content,
                title: tabData.title,
                status: tabData.status,
              },
            };
            return {
              tabs: updatedTabs,
              activeTabId: updatedTabs[existingTabIndex].id,
            };
          }
        }

        // Check if a tab with the same documentId already exists
        const existingDocTab = currentState.tabs.find(
          (tab) =>
            tab.artifact.documentId === tabData.documentId &&
            getWidgetKindForArtifact(tab.artifact.kind) === tabData.kind
        );

        if (existingDocTab) {
          // Activate the existing tab and update its data
          return {
            tabs: currentState.tabs.map((tab) =>
              tab.id === existingDocTab.id
                ? {
                    ...tab,
                    title: tabData.title,
                    artifact: {
                      ...tab.artifact,
                      content: tabData.content,
                      status: tabData.status,
                    },
                  }
                : tab
            ),
            activeTabId: existingDocTab.id,
          };
        }

        // Create a new tab (convert to legacy format for now)
        const newTab: CanvasTab = {
          id: generateTabId(),
          type: getTabTypeForArtifact(tabData.kind),
          title: tabData.title,
          artifact: {
            documentId: tabData.documentId,
            kind: tabData.kind,
            content: tabData.content,
            title: tabData.title,
            status: tabData.status,
            isVisible: true,
            boundingBox: { top: 0, left: 0, width: 0, height: 0 },
          },
          createdAt: Date.now(),
        };

        return {
          tabs: [...currentState.tabs, newTab],
          activeTabId: newTab.id,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Closes a tab by ID
   * If the closed tab was active, activates an adjacent tab
   */
  const closeTab = useCallback(
    (tabId: string) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;
        const tabIndex = currentState.tabs.findIndex((tab) => tab.id === tabId);

        if (tabIndex === -1) {
          return currentState;
        }

        const newTabs = currentState.tabs.filter((tab) => tab.id !== tabId);

        // Determine new active tab if the closed one was active
        let newActiveTabId = currentState.activeTabId;
        if (currentState.activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveTabId = null;
          } else if (tabIndex >= newTabs.length) {
            // Was last tab, activate the new last tab
            newActiveTabId = newTabs.at(-1)?.id || null;
          } else {
            // Activate the tab at the same index (next tab)
            newActiveTabId = newTabs[tabIndex]?.id || null;
          }
        }

        return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Switches to a specific tab
   */
  const switchTab = useCallback(
    (tabId: string) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;
        const tabExists = currentState.tabs.some((tab) => tab.id === tabId);

        if (!tabExists) {
          return currentState;
        }

        return {
          ...currentState,
          activeTabId: tabId,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Closes all tabs
   */
  const closeAllTabs = useCallback(() => {
    setTabsState(initialTabsState);
  }, [setTabsState]);

  /**
   * Closes all tabs of a specific type
   */
  const closeTabsByType = useCallback(
    (tabType: CanvasTabType) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;
        const newTabs = currentState.tabs.filter((tab) => tab.type !== tabType);

        let newActiveTabId = currentState.activeTabId;
        const activeTabWasClosed =
          currentState.activeTabId &&
          !newTabs.some((tab) => tab.id === currentState.activeTabId);

        if (activeTabWasClosed) {
          newActiveTabId = newTabs.at(-1)?.id || null;
        }

        return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Closes all tabs of a specific widget kind
   */
  const closeTabsByKind = useCallback(
    (kind: WidgetKind) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;
        const newTabs = currentState.tabs.filter(
          (tab) => getWidgetKindForArtifact(tab.artifact.kind) !== kind
        );

        let newActiveTabId = currentState.activeTabId;
        const activeTabWasClosed =
          currentState.activeTabId &&
          !newTabs.some((tab) => tab.id === currentState.activeTabId);

        if (activeTabWasClosed) {
          newActiveTabId = newTabs.at(-1)?.id || null;
        }

        return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
        };
      });
    },
    [setTabsState]
  );

  /**
   * Updates a tab's artifact data
   */
  const updateTabArtifact = useCallback(
    (tabId: string, artifact: Partial<UIArtifact>) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        return {
          ...currentState,
          tabs: currentState.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, artifact: { ...tab.artifact, ...artifact } }
              : tab
          ),
        };
      });
    },
    [setTabsState]
  );

  /**
   * Updates a tab's content
   */
  const updateTabContent = useCallback(
    (tabId: string, content: unknown) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        return {
          ...currentState,
          tabs: currentState.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, artifact: { ...tab.artifact, content } }
              : tab
          ),
        };
      });
    },
    [setTabsState]
  );

  /**
   * Updates a tab's status
   */
  const updateTabStatus = useCallback(
    (tabId: string, status: WidgetStatus) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        return {
          ...currentState,
          tabs: currentState.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, artifact: { ...tab.artifact, status } }
              : tab
          ),
        };
      });
    },
    [setTabsState]
  );

  /**
   * Updates a tab's title
   */
  const updateTabTitle = useCallback(
    (tabId: string, title: string) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        return {
          ...currentState,
          tabs: currentState.tabs.map((tab) =>
            tab.id === tabId
              ? { ...tab, title, artifact: { ...tab.artifact, title } }
              : tab
          ),
        };
      });
    },
    [setTabsState]
  );

  /**
   * Updates a tab by documentId
   * Used for streaming synchronization - updates content and status for all tabs with matching documentId
   */
  const updateTabByDocumentId = useCallback(
    (
      documentId: string,
      updates: {
        content?: unknown;
        status?: WidgetStatus;
        title?: string;
      }
    ) => {
      setTabsState((current) => {
        const currentState = current || initialTabsState;

        // Check if any tab has this documentId
        const hasMatchingTab = currentState.tabs.some(
          (tab) => tab.artifact.documentId === documentId
        );

        if (!hasMatchingTab) {
          return currentState;
        }

        return {
          ...currentState,
          tabs: currentState.tabs.map((tab) => {
            if (tab.artifact.documentId !== documentId) {
              return tab;
            }

            const updatedArtifact = { ...tab.artifact };

            if (updates.content !== undefined) {
              updatedArtifact.content = updates.content;
            }
            if (updates.status !== undefined) {
              updatedArtifact.status = updates.status;
            }
            if (updates.title !== undefined) {
              updatedArtifact.title = updates.title;
            }

            return {
              ...tab,
              title: updates.title ?? tab.title,
              artifact: updatedArtifact,
            };
          }),
        };
      });
    },
    [setTabsState]
  );

  /**
   * Finds a tab by documentId
   */
  const findTabByDocumentId = useCallback(
    (documentId: string): CanvasTab | null => {
      return (
        state.tabs.find((tab) => tab.artifact.documentId === documentId) || null
      );
    },
    [state.tabs]
  );

  // Derived state
  const activeTab = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId) || null,
    [state.tabs, state.activeTabId]
  );

  // Active tab as CanvasTabData (new format)
  const activeTabData = useMemo<CanvasTabData | null>(
    () => (activeTab ? tabToTabData(activeTab) : null),
    [activeTab]
  );

  // All tabs as CanvasTabData (new format)
  const tabsData = useMemo<CanvasTabData[]>(
    () => state.tabs.map(tabToTabData),
    [state.tabs]
  );

  const hasOpenTabs = state.tabs.length > 0;

  const isCanvasVisible = hasOpenTabs;

  return useMemo(
    () => ({
      // State (legacy format)
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      activeTab,
      hasOpenTabs,
      isCanvasVisible,

      // State (new format)
      tabsData,
      activeTabData,

      // Actions (legacy)
      openTab,
      closeTab,
      switchTab,
      closeAllTabs,
      closeTabsByType,
      updateTabArtifact,

      // Actions (new)
      openTabWithData,
      closeTabsByKind,
      updateTabContent,
      updateTabStatus,
      updateTabTitle,

      // Streaming sync actions
      updateTabByDocumentId,
      findTabByDocumentId,
    }),
    [
      state.tabs,
      state.activeTabId,
      activeTab,
      hasOpenTabs,
      isCanvasVisible,
      tabsData,
      activeTabData,
      openTab,
      closeTab,
      switchTab,
      closeAllTabs,
      closeTabsByType,
      updateTabArtifact,
      openTabWithData,
      closeTabsByKind,
      updateTabContent,
      updateTabStatus,
      updateTabTitle,
      updateTabByDocumentId,
      findTabByDocumentId,
    ]
  );
}

// ============================================================================
// SELECTOR HOOK
// ============================================================================

/**
 * useCanvasTabsSelector Hook
 * Allows selecting specific parts of the tabs state for optimized re-renders
 */
export function useCanvasTabsSelector<T>(
  selector: (state: CanvasTabsState) => T
): T {
  const { data: tabsState } = useSWR<CanvasTabsState>(CANVAS_TABS_KEY, null, {
    fallbackData: initialTabsState,
  });

  return useMemo(
    () => selector(tabsState || initialTabsState),
    [tabsState, selector]
  );
}
