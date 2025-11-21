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
      // Find artifact definition for custom onStreamPart handler

      // Handle standard artifact stream parts
      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case ARTIFACT_DATA_PART.id:
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.title:
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.kind:
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.clear:
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case ARTIFACT_DATA_PART.finish:
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
