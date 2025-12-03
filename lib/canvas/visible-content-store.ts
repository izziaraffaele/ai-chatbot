/**
 * Visible Content Store
 *
 * A lightweight global store for complex widgets to register their currently
 * visible content. This allows the agent to know what the user is actually
 * viewing inside a widget (e.g., a markdown file opened within the Fondazione Browser).
 *
 * The store is keyed by tab ID, so multiple tabs can have different visible content.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Represents the content currently being viewed within a complex widget.
 * This is different from the tab's artifact content - it represents what
 * the user is actually seeing on screen.
 */
export type VisibleContent = {
  /** Title of the viewed content (e.g., filename) */
  title: string;
  /** Optional description or path */
  description?: string;
  /** The actual content being viewed (typically text/markdown) */
  content: string;
  /** Content type hint for the agent */
  contentType?: "markdown" | "text" | "csv" | "json";
};

// ============================================================================
// STORE
// ============================================================================

// Internal store map: tabId -> VisibleContent
const visibleContentMap = new Map<string, VisibleContent>();

// Subscribers for reactive updates (if needed in the future)
const subscribers = new Set<() => void>();

/**
 * Notify all subscribers of a change
 */
function notifySubscribers(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

/**
 * Get the visible content for a specific tab.
 *
 * @param tabId - The tab ID to get content for
 * @returns The visible content, or undefined if none is registered
 */
export function getVisibleContent(tabId: string): VisibleContent | undefined {
  return visibleContentMap.get(tabId);
}

/**
 * Set the visible content for a specific tab.
 * Widgets should call this when displaying content that differs from
 * the tab's artifact content (e.g., viewing a file inside a browser widget).
 *
 * @param tabId - The tab ID to set content for
 * @param content - The visible content to register
 */
export function setVisibleContent(tabId: string, content: VisibleContent): void {
  visibleContentMap.set(tabId, content);
  notifySubscribers();
}

/**
 * Clear the visible content for a specific tab.
 * Widgets should call this when returning to their default view.
 *
 * @param tabId - The tab ID to clear content for
 */
export function clearVisibleContent(tabId: string): void {
  if (visibleContentMap.has(tabId)) {
    visibleContentMap.delete(tabId);
    notifySubscribers();
  }
}

/**
 * Clear all visible content for all tabs.
 * Useful for cleanup on unmount or reset.
 */
export function clearAllVisibleContent(): void {
  if (visibleContentMap.size > 0) {
    visibleContentMap.clear();
    notifySubscribers();
  }
}

/**
 * Subscribe to visible content changes.
 * Returns an unsubscribe function.
 *
 * @param callback - Function to call when content changes
 * @returns Unsubscribe function
 */
export function subscribeToVisibleContent(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Check if a tab has visible content registered.
 *
 * @param tabId - The tab ID to check
 * @returns true if the tab has visible content
 */
export function hasVisibleContent(tabId: string): boolean {
  return visibleContentMap.has(tabId);
}

