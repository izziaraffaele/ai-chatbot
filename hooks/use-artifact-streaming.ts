"use client";

import { useCallback } from "react";
import { artifactDefinitions } from "@/components/artifacts";
import { useDataStreamSubscription } from "@/components/chat/streaming";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";

/**
 * useArtifactStreaming Hook
 * Subscribes to artifact-specific data stream parts
 * Handles artifact state updates based on streaming deltas
 *
 * This hook demonstrates how to use the generic streaming system
 * for feature-specific logic (artifacts in this case)
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
