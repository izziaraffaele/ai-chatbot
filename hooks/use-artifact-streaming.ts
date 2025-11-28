"use client";

import { useCallback, useRef } from "react";
import { artifactDefinitions } from "@/components/artifacts";
import { useDataStreamSubscription } from "@/components/chat/streaming";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import {
  bindPendingTabToDocument,
  findPendingTab,
  mutateTabByDocumentId,
  resetAllStreamingTabs,
} from "@/hooks/use-canvas-tabs";

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

  // Subscribe to artifact-related stream parts
  useDataStreamSubscription(
    (part) => part.type.startsWith("data-"),
    handleStreamPart
  );
}

/**
 * useTabStreamSync Hook
 * Synchronizes streaming artifact content directly to canvas tabs.
 *
 * This hook subscribes to streaming data parts and updates the corresponding
 * tab's content via SWR mutate, ensuring the tab displays streaming content
 * in real-time without race conditions.
 *
 * Key responsibilities:
 * - Bind pending tabs to actual document IDs when `data-id` arrives
 * - Update tab content on `data-textDelta`, `data-codeDelta`, `data-sheetDelta` events
 * - Update tab status to "idle" on `data-finish` events
 * - Track current streaming documentId to target correct tab
 * - Retry binding on content deltas if initial binding failed (timing resilience)
 * - Defensive fallback: reset ALL streaming/pending tabs on `data-finish`
 *
 * Timing Resilience:
 * The DocumentTool component opens pending tabs in a useEffect, but stream events
 * can arrive BEFORE the useEffect runs. This hook handles this by:
 * 1. Always storing the document ID from `data-id` immediately
 * 2. Accumulating content even if no tab is found yet
 * 3. Retrying binding on each content delta if the tab update fails
 * 4. Resetting ALL streaming tabs on finish as a safety net
 */
export function useTabStreamSync() {
  // Track the current streaming document ID (actual ID, not pending)
  const streamingDocumentIdRef = useRef<string | null>(null);
  // Track accumulated content for the current stream
  const accumulatedContentRef = useRef<string>("");
  // Track pending metadata before document ID is known
  const pendingTitleRef = useRef<string | null>(null);
  // Track if we've successfully bound a tab for this stream
  const tabBoundRef = useRef<boolean>(false);

  /**
   * Attempts to bind a pending tab to the actual document ID.
   * Returns true if binding succeeded, false otherwise.
   */
  const tryBindPendingTab = useCallback((actualDocId: string): boolean => {
    const pendingTab = findPendingTab();
    if (pendingTab) {
      bindPendingTabToDocument(pendingTab.artifact.documentId, actualDocId);
      return true;
    }
    return false;
  }, []);

  /**
   * Attempts to update a tab's content. If update fails (no tab found),
   * tries to bind a pending tab first, then retries the update.
   */
  const updateTabWithRetry = useCallback(
    (
      docId: string,
      updates: { content?: string; status?: "streaming" | "idle" }
    ): boolean => {
      // First attempt
      let success = mutateTabByDocumentId(docId, updates);

      if (!success && !tabBoundRef.current) {
        // Tab not found - maybe pending tab wasn't bound yet due to timing
        // Try to bind now
        const didBind = tryBindPendingTab(docId);
        if (didBind) {
          tabBoundRef.current = true;

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

  const handleStreamPart = useCallback(
    (delta: any) => {
      switch (delta.type) {
        case "data-id": {
          // New document stream starting - store the documentId immediately
          const actualDocId = delta.data;
          streamingDocumentIdRef.current = actualDocId;
          accumulatedContentRef.current = "";
          tabBoundRef.current = false;

          // Attempt to bind pending tab (may fail if tab not created yet - that's OK)
          const didBind = tryBindPendingTab(actualDocId);
          if (didBind) {
            tabBoundRef.current = true;

            // If we had pending metadata, apply it now
            if (pendingTitleRef.current) {
              mutateTabByDocumentId(actualDocId, {
                title: pendingTitleRef.current,
              });
              pendingTitleRef.current = null;
            }
          }
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

          // Try to update tab (with retry logic for timing issues)
          if (streamingDocumentIdRef.current) {
            updateTabWithRetry(streamingDocumentIdRef.current, {
              content: accumulatedContentRef.current,
              status: "streaming",
            });
          }
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

          // Reset refs for next stream
          streamingDocumentIdRef.current = null;
          accumulatedContentRef.current = "";
          pendingTitleRef.current = null;
          tabBoundRef.current = false;
          break;
        }

        default:
          // Ignore other data-* events (data-kind, data-usage, etc.)
          break;
      }
    },
    [tryBindPendingTab, updateTabWithRetry]
  );

  // Subscribe to artifact-related stream parts
  useDataStreamSubscription(
    (part) => part.type.startsWith("data-"),
    handleStreamPart
  );
}
