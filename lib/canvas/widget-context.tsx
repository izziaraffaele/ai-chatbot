"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { WidgetKind, WidgetStatus } from "./widget-registry";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Widget context value - provided to each widget instance
 */
export type WidgetContextValue<TContent = unknown, TMeta = unknown> = {
  // Identity
  tabId: string;
  documentId: string;
  kind: WidgetKind;
  title: string;

  // Content state
  content: TContent;
  setContent: (content: TContent | ((prev: TContent) => TContent)) => void;

  // Status
  status: WidgetStatus;
  setStatus: (status: WidgetStatus) => void;
  isPending: boolean;
  isStreaming: boolean;
  isIdle: boolean;
  isError: boolean;

  // Metadata
  meta: TMeta | undefined;
  setMeta: (meta: TMeta | ((prev: TMeta | undefined) => TMeta)) => void;

  // Actions
  onClose: () => void;
  onTitleChange?: (title: string) => void;
};

// ============================================================================
// CONTEXT
// ============================================================================

const WidgetContext = createContext<WidgetContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export type WidgetContextProviderProps<TContent = unknown, TMeta = unknown> = {
  /** Unique tab identifier */
  tabId: string;
  /** Document identifier */
  documentId: string;
  /** Widget kind */
  kind: WidgetKind;
  /** Widget title */
  title: string;
  /**
   * Content from tab state (source of truth).
   * This is passed through directly instead of using local state
   * to ensure streaming updates are immediately reflected.
   */
  content: TContent;
  /** Current status from tab state */
  status?: WidgetStatus;
  /** Optional metadata */
  meta?: TMeta;
  /** Callback when content changes (updates tab state) */
  onContentChange?: (content: TContent) => void;
  /** Callback when status changes (updates tab state) */
  onStatusChange?: (status: WidgetStatus) => void;
  /** Callback to close the tab */
  onClose: () => void;
  /** Callback when title changes */
  onTitleChange?: (title: string) => void;
  /** Children */
  children: ReactNode;
};

/**
 * WidgetContextProvider
 * Provides per-tab context for widget state management.
 *
 * IMPORTANT: Content and status are now derived from props (tab state)
 * rather than local state. This ensures streaming updates flow through
 * immediately without race conditions.
 *
 * The tab state (managed by useCanvasTabs via SWR) is the single source
 * of truth. setContent and setStatus call the parent callbacks which
 * update the SWR cache.
 */
export function WidgetContextProvider<TContent = unknown, TMeta = unknown>({
  tabId,
  documentId,
  kind,
  title,
  content,
  status = "idle",
  meta,
  onContentChange,
  onStatusChange,
  onClose,
  onTitleChange,
  children,
}: WidgetContextProviderProps<TContent, TMeta>) {
  // Local state only for metadata (not streamed from server)
  const [localMeta, setLocalMeta] = useState<TMeta | undefined>(meta);

  // Content setter - calls parent callback to update tab state
  const setContent = useCallback(
    (newContent: TContent | ((prev: TContent) => TContent)) => {
      const nextContent =
        typeof newContent === "function"
          ? (newContent as (prev: TContent) => TContent)(content)
          : newContent;
      onContentChange?.(nextContent);
    },
    [content, onContentChange]
  );

  // Status setter - calls parent callback to update tab state
  const setStatus = useCallback(
    (newStatus: WidgetStatus) => {
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // Meta setter (local state, not streamed)
  const setMeta = useCallback(
    (newMeta: TMeta | ((prev: TMeta | undefined) => TMeta)) => {
      setLocalMeta((prev) => {
        return typeof newMeta === "function"
          ? (newMeta as (prev: TMeta | undefined) => TMeta)(prev)
          : newMeta;
      });
    },
    []
  );

  // Derived status flags
  const isPending = status === "pending";
  const isStreaming = status === "streaming";
  const isIdle = status === "idle";
  const isError = status === "error";

  // Memoized context value
  const value = useMemo<WidgetContextValue<TContent, TMeta>>(
    () => ({
      tabId,
      documentId,
      kind,
      title,
      content,
      setContent,
      status,
      setStatus,
      isPending,
      isStreaming,
      isIdle,
      isError,
      meta: localMeta,
      setMeta,
      onClose,
      onTitleChange,
    }),
    [
      tabId,
      documentId,
      kind,
      title,
      content,
      setContent,
      status,
      setStatus,
      isPending,
      isStreaming,
      isIdle,
      isError,
      localMeta,
      setMeta,
      onClose,
      onTitleChange,
    ]
  );

  return (
    <WidgetContext.Provider value={value as WidgetContextValue}>
      {children}
    </WidgetContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * useWidgetContext
 * Access the full widget context. Must be used within a WidgetContextProvider.
 */
export function useWidgetContext<
  TContent = unknown,
  TMeta = unknown,
>(): WidgetContextValue<TContent, TMeta> {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error(
      "useWidgetContext must be used within a WidgetContextProvider"
    );
  }
  return context as WidgetContextValue<TContent, TMeta>;
}

/**
 * useWidgetContent
 * Access only content-related state for optimized re-renders.
 */
export function useWidgetContent<TContent = unknown>(): {
  content: TContent;
  setContent: (content: TContent | ((prev: TContent) => TContent)) => void;
} {
  const { content, setContent } = useWidgetContext<TContent>();
  return { content, setContent };
}

/**
 * useWidgetStatus
 * Access only status-related state for optimized re-renders.
 */
export function useWidgetStatus(): {
  status: WidgetStatus;
  setStatus: (status: WidgetStatus) => void;
  isPending: boolean;
  isStreaming: boolean;
  isIdle: boolean;
  isError: boolean;
} {
  const { status, setStatus, isPending, isStreaming, isIdle, isError } =
    useWidgetContext();
  return { status, setStatus, isPending, isStreaming, isIdle, isError };
}

/**
 * useWidgetActions
 * Access widget actions (close, title change).
 */
export function useWidgetActions(): {
  onClose: () => void;
  onTitleChange?: (title: string) => void;
} {
  const { onClose, onTitleChange } = useWidgetContext();
  return { onClose, onTitleChange };
}

/**
 * useWidgetIdentity
 * Access widget identity (tabId, documentId, kind, title).
 */
export function useWidgetIdentity(): {
  tabId: string;
  documentId: string;
  kind: WidgetKind;
  title: string;
} {
  const { tabId, documentId, kind, title } = useWidgetContext();
  return { tabId, documentId, kind, title };
}

/**
 * useWidgetMeta
 * Access widget metadata.
 */
export function useWidgetMeta<TMeta = unknown>(): {
  meta: TMeta | undefined;
  setMeta: (meta: TMeta | ((prev: TMeta | undefined) => TMeta)) => void;
} {
  const { meta, setMeta } = useWidgetContext<unknown, TMeta>();
  return { meta, setMeta };
}
