"use client";

import { useCallback, useEffect, useRef } from "react";
import { artifactDefinitions } from "@/components/artifacts";
import { useDataStreamSubscription } from "@/components/chat/streaming";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import {
  bindPendingTabToDocument,
  findMostRecentPendingTab,
  mutateTabByDocumentId,
  openPendingTab,
  resetAllStreamingTabs,
} from "@/hooks/use-canvas-tabs";
import { generatePendingDocumentId } from "@/lib/canvas";

// Throttle interval for content updates (ms)
const CONTENT_UPDATE_THROTTLE_MS = 50;

/**
 * Stable filter function for data-* stream parts.
 * Defined outside the component to avoid recreation on every render.
 */
const filterDataStreamParts = (part: { type: string }) =>
  part.type.startsWith("data-");

/**
 * useArtifactStreaming Hook
 * Subscribes to artifact-specific data stream parts
 * Handles artifact state updates based on streaming deltas
 *
 * Note: Auto-opening of document tabs during streaming is handled by
 * the DocumentTool component (components/tools/document.tsx) for better
 * timing and access to tool state.
 */
export function useArtifactStreaming() {
  const { artifact, setArtifact, setMetadata } = useArtifact();

  const handleStreamPart = useCallback(
    (delta: any) => {
      // Find artifact definition for custom onStreamPart handler
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      // Handle standard artifact stream parts
      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    },
    [artifact.kind, setArtifact, setMetadata]
  );

  // Subscribe to artifact-related stream parts using stable filter
  useDataStreamSubscription(filterDataStreamParts, handleStreamPart);
}

/**
 * useTabStreamSync Hook
 * Synchronizes streaming artifact content directly to canvas tabs.
 *
 * This hook subscribes to streaming data parts and updates the corresponding
 * tab's content via SWR mutate, ensuring the tab displays streaming content
 * in real-time without race conditions.
 *
 * CRITICAL: Each `data-id` event starts a completely fresh streaming session.
 * This ensures that creating multiple documents in sequence works correctly -
 * each document gets its own independent binding and content routing.
 *
 * Key responsibilities:
 * - Treat each `data-id` as a NEW streaming session (reset all state)
 * - Bind pending tabs to actual document IDs using most-recently-created tab
 * - Update tab content on `data-textDelta`, `data-codeDelta`, `data-sheetDelta` events
 * - Update tab status to "idle" on `data-finish` events
 * - Always retry binding on content deltas if update fails
 * - Defensive fallback: reset ALL streaming/pending tabs on `data-finish`
 */
export function useTabStreamSync() {
  // Track the current streaming document ID (actual ID, not pending)
  const streamingDocumentIdRef = useRef<string | null>(null);
  // Track accumulated content for the current stream
  const accumulatedContentRef = useRef<string>("");
  // Track pending metadata before document ID is known
  const pendingTitleRef = useRef<string | null>(null);
  // Track pending kind before document ID is known
  const pendingKindRef = useRef<string | null>(null);
  // Track if a content flush is pending (for throttling)
  const flushPendingRef = useRef<boolean>(false);
  // Track the last flush time
  const lastFlushTimeRef = useRef<number>(0);
  // Track the throttle timer
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Attempts to bind the most recent pending tab to the actual document ID.
   * Returns true if binding succeeded, false otherwise.
   *
   * Uses findMostRecentPendingTab() to get the newest pending tab,
   * which is important when multiple documents are being created.
   */
  const tryBindPendingTab = useCallback((actualDocId: string): boolean => {
    const pendingTab = findMostRecentPendingTab();
    if (pendingTab) {
      const didBind = bindPendingTabToDocument(
        pendingTab.artifact.documentId,
        actualDocId
      );
      return didBind;
    }
    return false;
  }, []);

  /**
   * Attempts to update a tab's content. If update fails (no tab found),
   * tries to bind a pending tab first, then retries the update.
   *
   * IMPORTANT: Always retries binding if the initial update fails,
   * regardless of previous binding state. This handles cases where:
   * - Stream events arrive before DocumentTool creates the pending tab
   * - SWR cache hasn't propagated yet after binding
   */
  const updateTabWithRetry = useCallback(
    (
      docId: string,
      updates: { content?: string; status?: "streaming" | "idle" }
    ): boolean => {
      // First attempt
      let success = mutateTabByDocumentId(docId, updates);

      // If failed, always try to bind and retry (no early-exit based on previous state)
      if (!success) {
        const didBind = tryBindPendingTab(docId);
        if (didBind) {
          // Apply any pending title
          if (pendingTitleRef.current) {
            mutateTabByDocumentId(docId, { title: pendingTitleRef.current });
            pendingTitleRef.current = null;
          }

          // Retry the content update
          success = mutateTabByDocumentId(docId, updates);
        }
      }

      return success;
    },
    [tryBindPendingTab]
  );

  /**
   * Flushes accumulated content to the tab immediately.
   * Called by throttled updates and when stream finishes.
   */
  const flushContentUpdate = useCallback(() => {
    if (!streamingDocumentIdRef.current) {
      return;
    }

    flushPendingRef.current = false;
    lastFlushTimeRef.current = Date.now();

    updateTabWithRetry(streamingDocumentIdRef.current, {
      content: accumulatedContentRef.current,
      status: "streaming",
    });
  }, [updateTabWithRetry]);

  /**
   * Schedules a throttled content update.
   * If enough time has passed since the last update, flushes immediately.
   * Otherwise, schedules a flush for later.
   */
  const scheduleContentUpdate = useCallback(() => {
    // If no document is streaming, skip
    if (!streamingDocumentIdRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastFlush = now - lastFlushTimeRef.current;

    // If enough time has passed, flush immediately
    if (timeSinceLastFlush >= CONTENT_UPDATE_THROTTLE_MS) {
      // Cancel any pending timer
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      flushContentUpdate();
      return;
    }

    // Otherwise, schedule a flush if not already pending
    if (!flushPendingRef.current) {
      flushPendingRef.current = true;
      const delay = CONTENT_UPDATE_THROTTLE_MS - timeSinceLastFlush;

      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        flushContentUpdate();
      }, delay);
    }
  }, [flushContentUpdate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  const handleStreamPart = useCallback(
    (delta: any) => {
      switch (delta.type) {
        case "data-kind":
          // Buffer kind metadata before document ID is known
          pendingKindRef.current = delta.data;
          break;

        case "data-id": {
          // ================================================================
          // NEW STREAMING SESSION - Reset ALL state for fresh start
          // This is critical for multiple document creation to work correctly
          // ================================================================
          const actualDocId = delta.data;

          // Cancel any pending timer from previous stream FIRST
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
          }

          // Reset all session state
          streamingDocumentIdRef.current = actualDocId;
          accumulatedContentRef.current = "";
          flushPendingRef.current = false;
          lastFlushTimeRef.current = 0;

          // Attempt to bind the most recent pending tab to this document ID
          const didBind = tryBindPendingTab(actualDocId);

          if (didBind) {
            // Binding succeeded - apply any buffered metadata
            if (pendingTitleRef.current) {
              mutateTabByDocumentId(actualDocId, {
                title: pendingTitleRef.current,
              });
              pendingTitleRef.current = null;
            }
            // Set the tab to streaming status
            mutateTabByDocumentId(actualDocId, { status: "streaming" });
          } else {
            // No pending tab exists - create one directly with buffered metadata
            // This handles the case where stream events arrive before DocumentTool renders
            const kind = pendingKindRef.current || "text";
            const title = pendingTitleRef.current || "Document";

            // Create a tab directly with the actual document ID (no pending->bind dance)
            openPendingTab(
              `direct-${actualDocId.slice(0, 8)}`,
              kind as any,
              title
            );
            const pendingId = generatePendingDocumentId(
              `direct-${actualDocId.slice(0, 8)}`
            );
            bindPendingTabToDocument(pendingId, actualDocId);

            // Clear buffered metadata
            pendingTitleRef.current = null;
          }

          // Clear kind buffer after use
          pendingKindRef.current = null;
          break;
        }

        case "data-clear":
          // Clear content for this document
          accumulatedContentRef.current = "";
          if (streamingDocumentIdRef.current) {
            updateTabWithRetry(streamingDocumentIdRef.current, {
              content: "",
              status: "streaming",
            });
          }
          break;

        case "data-textDelta":
        case "data-codeDelta":
        case "data-sheetDelta": {
          // Always accumulate content, even if we don't have a tab yet
          accumulatedContentRef.current += delta.data;

          // Schedule a throttled content update
          scheduleContentUpdate();
          break;
        }

        case "data-title":
          // Update tab title
          if (streamingDocumentIdRef.current) {
            const success = mutateTabByDocumentId(
              streamingDocumentIdRef.current,
              {
                title: delta.data,
              }
            );
            if (!success) {
              // Store for later if tab doesn't exist yet
              pendingTitleRef.current = delta.data;
            }
          } else {
            // Document ID not yet known, store title for later
            pendingTitleRef.current = delta.data;
          }
          break;

        case "data-finish": {
          // Cancel any pending throttle timer
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
          }

          // Flush any remaining content immediately
          if (streamingDocumentIdRef.current && flushPendingRef.current) {
            flushContentUpdate();
          }

          // Stream finished - update status to idle
          if (streamingDocumentIdRef.current) {
            updateTabWithRetry(streamingDocumentIdRef.current, {
              status: "idle",
            });
          }

          // Defensive fallback: reset ALL streaming/pending tabs
          // This ensures no tabs get stuck in "Generating..." state even if
          // events were missed or arrived out of order
          const resetCount = resetAllStreamingTabs();
          if (resetCount > 0 && !streamingDocumentIdRef.current) {
            console.warn(
              `[useTabStreamSync] Reset ${resetCount} stuck streaming tab(s) on data-finish`
            );
          }

          // ================================================================
          // FULLY RESET session state for next document
          // This ensures the next data-id starts completely fresh
          // ================================================================
          streamingDocumentIdRef.current = null;
          accumulatedContentRef.current = "";
          pendingTitleRef.current = null;
          pendingKindRef.current = null;
          flushPendingRef.current = false;
          lastFlushTimeRef.current = 0;
          break;
        }

        default:
          // Ignore other data-* events (data-usage, etc.)
          break;
      }
    },
    [
      tryBindPendingTab,
      updateTabWithRetry,
      scheduleContentUpdate,
      flushContentUpdate,
    ]
  );

  // Subscribe to artifact-related stream parts using stable filter
  useDataStreamSubscription(filterDataStreamParts, handleStreamPart);
}
