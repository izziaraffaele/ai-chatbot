"use client";

import type { DataUIPart } from "ai";
import { useCallback } from "react";
import { useDataStreamSubscription } from "@/components/chat/streaming";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { ChatDataTypes } from "@/lib/types";

const ARTIFACT_DATA_PART = {
  id: "data-id",
  title: "data-title",
  kind: "data-kind",
  clear: "data-clear",
  finish: "data-finish",
  textDelta: "data-textDelta",
  codeDelta: "data-codeDelta",
  sheetDelta: "data-sheetDelta",
  builderInit: "data-builder-init",
} as const;

/**
 * useArtifactStreaming Hook
 * Subscribes to artifact-specific data stream parts
 * Handles artifact state updates based on streaming deltas
 *
 * This hook demonstrates how to use the generic streaming system
 * for feature-specific logic (artifacts in this case)
 */
export function useArtifactStreaming() {
  const { setArtifact } = useArtifact();

  const handleStreamPart = useCallback(
    (delta: DataUIPart<ChatDataTypes>) => {
      console.log("[useArtifactStreaming] Handling stream part:", delta.type);

      // Find artifact definition for custom onStreamPart handler

      // Handle standard artifact stream parts
      setArtifact((draftArtifact) => {
        console.log("[useArtifactStreaming] Current artifact status:", draftArtifact?.status);

        if (!draftArtifact) {
          console.log("[useArtifactStreaming] Creating new artifact with streaming status");
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case ARTIFACT_DATA_PART.id:
            console.log("[useArtifactStreaming] Setting document ID:", delta.data);
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.title:
            console.log("[useArtifactStreaming] Setting title:", delta.data);
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.kind:
            console.log("[useArtifactStreaming] Setting kind:", delta.data);
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.clear:
            console.log("[useArtifactStreaming] Clearing content");
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.finish:
            console.log("[useArtifactStreaming] Finishing streaming - changing status to idle");
            return {
              ...draftArtifact,
              status: "idle",
            };

          case ARTIFACT_DATA_PART.textDelta:
          case ARTIFACT_DATA_PART.sheetDelta:
          case ARTIFACT_DATA_PART.codeDelta:
            return {
              ...draftArtifact,
              status: "streaming",
              content: draftArtifact.content + delta.data,
              isVisible:
                draftArtifact.status === "streaming" &&
                draftArtifact.content.length > 400 &&
                draftArtifact.content.length < 450
                  ? true
                  : draftArtifact.isVisible,
            };

          case ARTIFACT_DATA_PART.builderInit:
            // Builder artifact: show immediately, no streaming content
            console.log("[useArtifactStreaming] Builder init:", delta.data);
            return {
              ...draftArtifact,
              status: "idle",
              isVisible: true,
              content: JSON.stringify((delta.data as any)?.initialState || {}),
            };

          default:
            return draftArtifact;
        }
      });
    },
    [setArtifact]
  );

  // Subscribe to artifact-related stream parts
  const filter = useCallback(
    (part: DataUIPart<ChatDataTypes>) =>
      (Object.values(ARTIFACT_DATA_PART) as string[]).includes(part.type),
    []
  );

  useDataStreamSubscription(filter, handleStreamPart);
}
