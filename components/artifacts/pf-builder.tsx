"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
  type UIArtifact,
} from "@/components/chat/artifact";
import { useChatContext } from "@/components/chat/context";
import { PFBuilderContent } from "@/components/pf-builder";
import { useArtifact } from "@/hooks/use-artifact";
import { useClientTools } from "@/hooks/use-client-tools";
import {
  createPFBuilderNotifyTool,
  createPFBuilderUpdateUFTool,
  emitChatUpdateUF,
  formatEventMessage,
  PF_BUILDER_TOOL_ID,
  PF_BUILDER_UPDATE_UF_TOOL_ID,
  type PFBuilderState,
  pfBuilderEventBus,
  usePFBuilderState,
} from "@/lib/pf-builder";
import { cn } from "@/lib/utils";

export type PFBuilderArtifactProps = {
  artifact: UIArtifact<string, string>;
  isReadonly?: boolean;
  className?: string;
};

/**
 * PFBuilderArtifact
 * Renders the interactive Percorso Formativo builder in the canvas
 * with chat synchronization
 */
export function PFBuilderArtifact({
  artifact,
  className,
  isReadonly: _isReadonly = false,
}: PFBuilderArtifactProps) {
  const { setArtifact } = useArtifact();
  const registry = useClientTools();
  const { chat } = useChatContext();
  // Get the current builder state from context (updated by PFBuilderInner)
  const builderState = usePFBuilderState();
  // Use a ref to always access the current state in tool callbacks
  const stateRef = useRef<PFBuilderState | null>(null);

  // Keep the ref in sync with the context state
  useEffect(() => {
    stateRef.current = builderState;
  }, [builderState]);

  // Register client tools for chat-canvas sync (only once on mount)
  useEffect(() => {
    // Create the notify tool with state accessor via ref
    const notifyTool = createPFBuilderNotifyTool(() => stateRef.current);
    registry.register(notifyTool);

    // Create the update UF tool
    // This tool uses the event bus to communicate with the builder
    // The dispatch happens in PFBuilderInner which listens to chat events
    const updateUFTool = createPFBuilderUpdateUFTool(
      () => stateRef.current,
      (action) => {
        // Dispatch is handled via event bus - emit the appropriate event
        if (action.type === "BULK_ADD_UF") {
          emitChatUpdateUF(action.payload.uf, "merge");
        } else if (action.type === "BULK_REPLACE_UF") {
          emitChatUpdateUF(action.payload.uf, "replace");
        }
      }
    );
    registry.register(updateUFTool);

    // Subscribe to canvas events and forward to chat
    // Note: Using type assertion because pfBuilderNotify is a client-side tool
    // and addToolResult is typed for server-side Mastra tools only
    const unsubscribe = pfBuilderEventBus.subscribe((event) => {
      if (event.source === "canvas") {
        const message = formatEventMessage(event);

        // Add tool result to chat to notify the agent
        chat.addToolResult({
          tool: PF_BUILDER_TOOL_ID as any,
          toolCallId: `canvas-${event.timestamp}`,
          output: {
            type: event.type,
            data: event.payload,
            message,
          },
        });
      }
    });

    return () => {
      registry.deregister(PF_BUILDER_TOOL_ID);
      registry.deregister(PF_BUILDER_UPDATE_UF_TOOL_ID);
      unsubscribe();
    };
  }, [registry, chat]);

  const handleClose = useCallback(() => {
    setArtifact((v) => ({ ...v, isVisible: false }));
  }, [setArtifact]);

  // Parse initial state from artifact content
  const initialState = artifact.content
    ? JSON.parse(artifact.content)
    : undefined;

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        onClose={handleClose}
        subtitle="Costruisci il tuo percorso formativo professionale"
        title={artifact.title || "Percorso Formativo Builder"}
      />

      <ChatArtifactBody>
        <PFBuilderContent
          builderId={artifact.documentId}
          initialState={initialState}
          status={artifact.status}
          title={artifact.title}
        />
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

/**
 * Type guard for PF Builder artifact
 */
export function isPFBuilderArtifact(kind: string): kind is "pf-builder" {
  return kind === "pf-builder";
}
