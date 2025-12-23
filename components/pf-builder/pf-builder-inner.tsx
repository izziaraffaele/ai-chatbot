"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatContext, useChatMessages } from "@/components/chat/context";
import { usePlayer } from "@/components/player";
import { useArtifact } from "@/hooks/use-artifact";
import { useAssistantAction } from "@/hooks/use-assistant-action";
import { usePFBuilder } from "@/hooks/use-pf-builder";
import { useTranslations } from "@/lib/i18n";
import { PF_BUILDER_TOOL_ID } from "@/lib/pf-builder/client-tool";
import { loadFigurePerSettore } from "@/lib/pf-builder/data-loader";
import { logPFBuilderSync } from "@/lib/pf-builder/debug";
import {
  generateDocumentTitle,
  generatePFDocument,
} from "@/lib/pf-builder/document-generator";
import {
  emitCanvasEvent,
  formatEventMessage,
  pfBuilderEventBus,
} from "@/lib/pf-builder/event-bus";
import { usePFBuilderStateUpdater } from "@/lib/pf-builder/state-context";
import { createPFBuilderSuggestFiguresTool } from "@/lib/pf-builder/suggest-figures-tool";
import type {
  PercorsoFormativo,
  PFBuilderEvent,
  PFBuilderState,
  UfInput,
} from "@/lib/pf-builder/types";
import { generateUUID } from "@/lib/utils";
import { AdaDetailsStep } from "./steps/ada-details-step";
// Step Components
import { SelectTypeStep } from "./steps/select-type-step";
import { SummaryStep } from "./steps/summary-step";
import { UfAdaStep } from "./steps/uf-ada-step";
import { UfFigureStep } from "./steps/uf-figure-step";
import { UfInputStep } from "./steps/uf-input-step";
import { UfSectorStep } from "./steps/uf-sector-step";

// Auto-message for UF_INPUT step (shown once when entering UF_INPUT from SELECT_TYPE)
const UF_INPUT_WELCOME_MESSAGE =
  "Perfetto. Ora inserisci le Unità Formative (UF) per creare il Percorso Formativo (PF). Puoi scriverle nel canvas oppure in chat: le sincronizzerò per te.";

// Auto-message for UF_FIGURE step (shown once when entering UF_FIGURE from UF_SECTOR)
const UF_FIGURE_WELCOME_MESSAGE =
  "Ora devi selezionare una Figura Professionale per ogni Unità Formativa. Puoi scegliere dal menu a tendina nel canvas. Se vuoi, posso suggerirti le figure più adatte: scrivi 'consigliami' o 'suggerisci' e ti darò i miei consigli per ogni UF!";

type PFBuilderInnerProps = {
  builderId?: string;
  initialState?: Partial<PFBuilderState>;
  title: string;
};

export function PFBuilderInner({
  builderId,
  initialState,
  title,
}: PFBuilderInnerProps) {
  const t = useTranslations();
  const { store, state: attemptState } = usePlayer();
  const { chat } = useChatContext();
  const { messages, setMessages } = useChatMessages();
  const { setArtifact } = useArtifact();
  const hasShownUfInputMessage = useRef(false);
  const hasShownUfFigureMessage = useRef(false);
  const prevStepRef = useRef<string | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);

  const builder = usePFBuilder({
    ...initialState,
    titolo: initialState?.titolo ?? title ?? "",
  });

  const { state, progress, stepName } = builder;

  // Get the state updater from context (to publish state for chat awareness)
  const setPFBuilderState = usePFBuilderStateUpdater();

  // Create a ref to always access the latest state in callbacks
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Create the suggest figures tool with proper dependencies
  // The tool reads state from ref to always have latest data
  const suggestFiguresTool = useMemo(
    () =>
      createPFBuilderSuggestFiguresTool(
        // getCurrentState: returns the latest builder state
        () => stateRef.current,
        // getFigurePerSettore: loads figures from JSON data
        loadFigurePerSettore,
        // callSuggesterAgent: calls the API endpoint to get AI suggestions
        async (prompt: string) => {
          const response = await fetch("/api/suggest-figures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          });

          if (!response.ok) {
            throw new Error("Failed to get figure suggestions");
          }

          const data = await response.json();
          return data.response;
        }
      ),
    []
  );

  // Register the suggest figures tool when the builder is active
  useAssistantAction(suggestFiguresTool);

  // Publish builder state to context whenever it changes
  // This allows the chat agent to be aware of current selections
  useEffect(() => {
    if (setPFBuilderState) {
      setPFBuilderState(state);

      // Log in dev mode
      logPFBuilderSync({
        isActive: true,
        step: state.step,
        ufCount: state.unitaFormative.length,
      });
    }

    // Clear state on unmount
    return () => {
      if (setPFBuilderState) {
        setPFBuilderState(null);
      }
    };
  }, [state, setPFBuilderState]);

  // Start attempt on mount
  useEffect(() => {
    if (!attemptState.currentAttempt) {
      store.start({ builderId });
    }
  }, [store, attemptState.currentAttempt, builderId]);

  // Track step changes and send auto-message for UF_INPUT
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally excluding state.unitaFormative to avoid retriggering on UF changes
  useEffect(() => {
    if (attemptState.currentAttempt?.status === "in_progress") {
      store.sendEvent({
        action: `step.${state.step}`,
        data: { step: state.step },
      });
    }

    // Send auto-message when entering UF_INPUT for the first time
    // This injects an assistant message into the chat when user clicks "Qualifica"
    // The message guides the user on how to add UF (via canvas or chat)
    // The ref ensures this only happens once per builder session (no duplicates on back/forth)
    if (
      state.step === "UF_INPUT" &&
      prevStepRef.current === "SELECT_TYPE" &&
      !hasShownUfInputMessage.current
    ) {
      hasShownUfInputMessage.current = true;

      // Inject assistant message into chat using setMessages
      setMessages([
        ...messages,
        {
          id: generateUUID(),
          role: "assistant",
          parts: [{ type: "text", text: UF_INPUT_WELCOME_MESSAGE }],
          metadata: { createdAt: new Date().toISOString() },
        },
      ]);
    }

    // Send auto-message when entering UF_FIGURE for the first time
    // This injects an assistant message to guide figure selection
    // and inform the user they can ask for suggestions
    if (
      state.step === "UF_FIGURE" &&
      prevStepRef.current === "UF_SECTOR" &&
      !hasShownUfFigureMessage.current
    ) {
      hasShownUfFigureMessage.current = true;

      // Inject assistant message into chat
      setMessages([
        ...messages,
        {
          id: generateUUID(),
          role: "assistant",
          parts: [{ type: "text", text: UF_FIGURE_WELCOME_MESSAGE }],
          metadata: { createdAt: new Date().toISOString() },
        },
      ]);

      // Emit an event with UF data for suggestions
      // This provides context to the chat agent for figure suggestions
      const ufDataForSuggestions = state.unitaFormative
        .filter((uf) => uf.settore && !uf.figura)
        .map((uf) => ({
          ufId: uf.id,
          ufNome: uf.nome,
          ufDescrizione: uf.descrizione,
          settore: uf.settore,
        }));

      emitCanvasEvent("STEP_CHANGED", {
        step: "UF_FIGURE",
        ufDataForSuggestions,
        message: `Utente è entrato nello step di selezione Figure Professionali. UF senza figura: ${ufDataForSuggestions.map((uf) => `"${uf.ufNome}" (settore: ${uf.settore})`).join(", ")}`,
      });
    }

    prevStepRef.current = state.step;
  }, [
    state.step,
    store,
    attemptState.currentAttempt?.status,
    messages,
    setMessages,
  ]);

  // Subscribe to event bus:
  // 1. Forward canvas events to chat
  // 2. Handle chat events (bulk UF updates) by dispatching to reducer
  useEffect(() => {
    const handleEvent = (event: PFBuilderEvent) => {
      if (event.source === "canvas") {
        // Forward canvas events to chat
        // Note: Using type assertion because pfBuilderNotify is a client-side tool
        // and addToolResult is typed for server-side Mastra tools only
        const message = formatEventMessage(event);
        chat.addToolResult({
          tool: PF_BUILDER_TOOL_ID as any,
          toolCallId: `canvas-${event.timestamp}`,
          output: {
            type: event.type,
            data: event.payload,
            message,
          },
        });
      } else if (event.source === "chat") {
        // Handle chat events by dispatching to reducer
        const payload = event.payload as {
          uf: UfInput[];
          operation: "merge" | "replace";
        };

        if (event.type === "UF_BULK_ADDED") {
          builder.bulkAddUf(payload.uf);
        } else if (event.type === "UF_BULK_REPLACED") {
          builder.bulkReplaceUf(payload.uf);
        }
      }
    };

    const unsubscribe = pfBuilderEventBus.subscribe(handleEvent);
    return unsubscribe;
  }, [chat, builder]);

  const handleComplete = useCallback(async () => {
    // Build the final Percorso Formativo
    const percorsoFormativo: PercorsoFormativo = {
      id: builderId ?? crypto.randomUUID(),
      tipo: state.tipo ?? "qualifica",
      titolo: state.titolo,
      unitaFormative: state.unitaFormative,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Emit completion event
    emitCanvasEvent("PF_COMPLETED", {
      pf: percorsoFormativo,
      titolo: percorsoFormativo.titolo,
    });

    // Complete the attempt
    await store.complete({
      score: { raw: 100, max: 100 },
      metadata: { percorsoFormativo },
    });
  }, [builderId, state, store]);

  /**
   * Handle document creation
   * 1. Generate markdown content from state
   * 2. Save to database via API
   * 3. Open in canvas as text artifact
   */
  const handleCreateDocument = useCallback(async () => {
    setIsCreatingDocument(true);

    try {
      // Generate document content and title
      const content = generatePFDocument(state);
      const documentTitle = generateDocumentTitle(state);
      const documentId = generateUUID();

      // Save document via API
      const response = await fetch(`/api/document?id=${documentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: documentTitle,
          content,
          kind: "text",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save document");
      }

      // Open document in canvas
      setArtifact({
        documentId,
        kind: "text",
        content,
        title: documentTitle,
        isVisible: true,
        status: "idle",
        boundingBox: {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
        },
      });

      toast.success(
        t("pfBuilder.summary.documentCreated", "Documento creato con successo!")
      );
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error(
        t(
          "pfBuilder.summary.documentError",
          "Errore nella creazione del documento"
        )
      );
    } finally {
      setIsCreatingDocument(false);
    }
  }, [state, setArtifact, t]);

  const _handleCancel = useCallback(async () => {
    await store.abandon({ metadata: { reason: "user_cancelled" } });
    builder.reset();
  }, [store, builder]);

  return (
    <div className="flex h-full flex-col" data-testid="pf-builder-container">
      {/* Header with progress */}
      <PFBuilderHeader
        currentStep={stepName}
        progress={progress}
        title={state.titolo || "Nuovo Percorso Formativo"}
      />

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {state.step === "SELECT_TYPE" && (
          <SelectTypeStep onSelect={builder.selectType} selected={state.tipo} />
        )}

        {state.step === "UF_INPUT" && (
          <UfInputStep
            builder={builder}
            onBack={() => builder.goToStep("SELECT_TYPE")}
          />
        )}

        {state.step === "UF_SECTOR" && (
          <UfSectorStep
            builder={builder}
            onBack={builder.prevStep}
            onNext={builder.nextStep}
          />
        )}

        {state.step === "UF_FIGURE" && (
          <UfFigureStep
            builder={builder}
            onBack={builder.prevStep}
            onNext={builder.nextStep}
          />
        )}

        {state.step === "UF_ADA" && (
          <UfAdaStep
            builder={builder}
            onBack={builder.prevStep}
            onNext={builder.nextStep}
          />
        )}

        {state.step === "ADA_DETAILS" &&
          builder.currentUf &&
          builder.currentAda && (
            <AdaDetailsStep
              ada={builder.currentAda}
              adaIndex={state.currentAdaIndex ?? 0}
              errors={state.errors}
              onBack={builder.prevAda}
              onNext={builder.nextAda}
              onToggleCapacita={builder.toggleCapacita}
              onToggleConoscenza={builder.toggleConoscenza}
              totalAda={builder.currentUf.adaList.length}
              ufName={builder.currentUf.nome}
            />
          )}

        {state.step === "SUMMARY" && (
          <SummaryStep
            isCreatingDocument={isCreatingDocument}
            onComplete={handleComplete}
            onCreateDocument={handleCreateDocument}
            onEdit={() => builder.goToStep("UF_INPUT")}
            onSetTitle={builder.setTitle}
            state={state}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

type PFBuilderHeaderProps = {
  title: string;
  currentStep: string;
  progress: number;
};

function PFBuilderHeader({
  title,
  currentStep,
  progress,
}: PFBuilderHeaderProps) {
  return (
    <div className="border-border border-b bg-muted/30 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className="text-muted-foreground text-sm">{currentStep}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-muted-foreground text-sm">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
