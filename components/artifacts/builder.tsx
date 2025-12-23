"use client";

import type React from "react";
import { useCallback } from "react";
import { BuilderContent } from "@/artifacts/builder/components/builder-content";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
  type UIArtifact,
} from "@/components/chat/artifact";
import { useArtifact } from "@/hooks/use-artifact";
import { cn } from "@/lib/utils";

export type BuilderArtifactProps = {
  artifact: UIArtifact<string, string>;
  isReadonly?: boolean;
  className?: string;
};

/**
 * BuilderArtifact
 * Renders the interactive training path builder in the canvas
 */
export function BuilderArtifact({
  artifact,
  className,
  isReadonly = false,
}: BuilderArtifactProps) {
  const { setArtifact } = useArtifact();

  const handleClose = useCallback(() => {
    setArtifact((v) => ({ ...v, isVisible: false }));
  }, [setArtifact]);

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        onClose={handleClose}
        subtitle="Costruisci il tuo percorso formativo"
        title={artifact.title || "Percorso Formativo Builder"}
      />

      <ChatArtifactBody>
        <BuilderContent
          builderId={artifact.documentId}
          initialData={artifact.content ? JSON.parse(artifact.content) : undefined}
          status={artifact.status}
          title={artifact.title}
        />
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

/**
 * Type guard for builder artifact
 */
export function isBuilderArtifact(kind: string): kind is "builder" {
  return kind === "builder";
}

