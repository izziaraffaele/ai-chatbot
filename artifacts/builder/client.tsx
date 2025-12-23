"use client";

import { Artifact } from "@/components/create-artifact";
import { BuilderContent } from "./components/builder-content";

/**
 * Builder Artifact Definition
 * 
 * Interactive artifact for building professional training paths.
 * Unlike document artifacts, this doesn't stream content from AI,
 * but presents an interactive UI that the user navigates.
 */
export const builderArtifact = new Artifact<"builder", { builderId?: string }>({
  kind: "builder",
  description: "Interactive builder for creating professional training paths based on Regione Toscana catalog.",
  
  initialize: async ({ documentId, setMetadata }) => {
    // Store the builder ID for potential persistence
    setMetadata({ builderId: documentId });
  },

  onStreamPart: ({ streamPart, setArtifact }) => {
    // Builder artifact receives minimal stream parts - just initialization data
    if (streamPart.type === "data-builder-init") {
      setArtifact((draft) => ({
        ...draft,
        status: "idle",
        isVisible: true,
      }));
    }
  },

  content: ({
    title,
    content,
    status,
    isCurrentVersion,
    metadata,
    setMetadata,
  }) => {
    return (
      <BuilderContent
        builderId={metadata?.builderId}
        initialData={content ? JSON.parse(content) : undefined}
        status={status}
        title={title}
      />
    );
  },

  actions: [
    // Builder doesn't need version navigation actions
    // Add custom actions for builder-specific functionality
  ],

  toolbar: [
    // Builder has its own internal navigation/actions
  ],
});

