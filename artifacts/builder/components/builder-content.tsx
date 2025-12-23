"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Player, usePlayer } from "@/components/player";
import { createAttemptStore } from "@/lib/activity-tracking";
import { cn } from "@/lib/utils";
import { builderReducer, canProceedToNextStep, getStepIndex, getTotalSteps } from "../reducer";
import type { BuilderState, TrainingModule, TrainingPath } from "../types";
import { initialBuilderState } from "../types";
import { AdaStep } from "./steps/ada-step";
import { FiguraStep } from "./steps/figura-step";
import { ModuliStep } from "./steps/moduli-step";
import { RiepilogoStep } from "./steps/riepilogo-step";
import { SettoreStep } from "./steps/settore-step";
import { CompletedStep } from "./steps/completed-step";

type BuilderContentProps = {
  builderId?: string;
  initialData?: Partial<BuilderState>;
  status: "streaming" | "idle";
  title: string;
};

/**
 * BuilderContent - Main container for the training path builder
 * Wraps the builder with Player for activity tracking
 */
export function BuilderContent({
  builderId,
  initialData,
  status,
  title,
}: BuilderContentProps) {
  const store = useMemo(
    () => createAttemptStore(builderId || "builder", "training-path-builder"),
    [builderId]
  );

  return (
    <Player className="h-full border-none rounded-none bg-background" store={store}>
      <BuilderInner
        builderId={builderId}
        initialData={initialData}
        title={title}
      />
    </Player>
  );
}

type BuilderInnerProps = {
  builderId?: string;
  initialData?: Partial<BuilderState>;
  title: string;
};

function BuilderInner({ builderId, initialData, title }: BuilderInnerProps) {
  const { store, state: attemptState } = usePlayer();

  const [state, dispatch] = useReducer(builderReducer, {
    ...initialBuilderState,
    ...initialData,
    titolo: initialData?.titolo || title || "",
  });

  // Start attempt on mount
  useEffect(() => {
    if (!attemptState.currentAttempt) {
      store.start({ builderId });
    }
  }, [store, attemptState.currentAttempt, builderId]);

  // Track step changes
  useEffect(() => {
    if (attemptState.currentAttempt?.status === "in_progress") {
      store.sendEvent({
        action: `step.${state.step}`,
        data: { step: state.step },
      });
    }
  }, [state.step, store, attemptState.currentAttempt?.status]);

  const canProceed = canProceedToNextStep(state);
  const stepIndex = getStepIndex(state.step);
  const totalSteps = getTotalSteps();
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  const handleComplete = useCallback(async () => {
    // Build the final training path
    const trainingPath: TrainingPath = {
      id: builderId || crypto.randomUUID(),
      titolo: state.titolo,
      settore: state.selectedSettore || "",
      figura: state.selectedFigura || "",
      figuraDescrizione: state.selectedFiguraDescrizione || undefined,
      moduli: state.moduli,
      durataComplessiva: state.moduli.reduce(
        (sum, m) => sum + (m.durata || 0),
        0
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Complete the attempt
    await store.complete({
      score: { raw: 100, max: 100 },
      metadata: { trainingPath },
    });

    dispatch({ type: "GO_TO_STEP", payload: "completato" });
  }, [builderId, state, store]);

  const handleCancel = useCallback(async () => {
    await store.abandon({ metadata: { reason: "user_cancelled" } });
  }, [store]);

  return (
    <div className="flex h-full flex-col">
      {/* Header with progress */}
      <BuilderHeader
        currentStep={stepIndex + 1}
        progress={progress}
        title={state.titolo || "Nuovo Percorso Formativo"}
        totalSteps={totalSteps}
      />

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {state.step === "settore" && (
          <SettoreStep
            onSelect={(settore) =>
              dispatch({ type: "SELECT_SETTORE", payload: settore })
            }
            selected={state.selectedSettore}
          />
        )}

        {state.step === "figura" && state.selectedSettore && (
          <FiguraStep
            onSelect={(figura) =>
              dispatch({ type: "SELECT_FIGURA", payload: figura })
            }
            selected={state.selectedFigura}
            settore={state.selectedSettore}
          />
        )}

        {state.step === "ada" && state.selectedFigura && (
          <AdaStep
            figura={state.selectedFigura}
            onToggle={(ada) => dispatch({ type: "TOGGLE_ADA", payload: ada })}
            selected={state.selectedAda}
          />
        )}

        {state.step === "moduli" && (
          <ModuliStep
            moduli={state.moduli}
            onSetModuli={(moduli) =>
              dispatch({ type: "SET_MODULI", payload: moduli })
            }
            onUpdateModulo={(id, updates) =>
              dispatch({ type: "UPDATE_MODULO", payload: { id, updates } })
            }
            selectedAda={state.selectedAda}
          />
        )}

        {state.step === "riepilogo" && (
          <RiepilogoStep
            onSetTitolo={(titolo) =>
              dispatch({ type: "SET_TITOLO", payload: titolo })
            }
            state={state}
          />
        )}

        {state.step === "completato" && (
          <CompletedStep state={state} />
        )}
      </div>

      {/* Navigation footer */}
      {state.step !== "completato" && (
        <BuilderFooter
          canProceed={canProceed}
          isFirstStep={stepIndex === 0}
          isLastStep={state.step === "riepilogo"}
          onBack={() => dispatch({ type: "PREV_STEP" })}
          onCancel={handleCancel}
          onComplete={handleComplete}
          onNext={() => dispatch({ type: "NEXT_STEP" })}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

type BuilderHeaderProps = {
  title: string;
  currentStep: number;
  totalSteps: number;
  progress: number;
};

function BuilderHeader({
  title,
  currentStep,
  totalSteps,
  progress,
}: BuilderHeaderProps) {
  return (
    <div className="border-b border-border bg-muted/30 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Passo {currentStep} di {totalSteps}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
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

type BuilderFooterProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  onCancel: () => void;
};

function BuilderFooter({
  isFirstStep,
  isLastStep,
  canProceed,
  onBack,
  onNext,
  onComplete,
  onCancel,
}: BuilderFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-border bg-background px-6 py-4">
      <div>
        {isFirstStep ? (
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onCancel}
            type="button"
          >
            Annulla
          </button>
        ) : (
          <button
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={onBack}
            type="button"
          >
            <span>←</span> Indietro
          </button>
        )}
      </div>
      <div>
        {isLastStep ? (
          <button
            className={cn(
              "rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors",
              canProceed
                ? "hover:bg-primary/90"
                : "cursor-not-allowed opacity-50"
            )}
            disabled={!canProceed}
            onClick={onComplete}
            type="button"
          >
            Crea Percorso
          </button>
        ) : (
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors",
              canProceed
                ? "hover:bg-primary/90"
                : "cursor-not-allowed opacity-50"
            )}
            disabled={!canProceed}
            onClick={onNext}
            type="button"
          >
            Avanti <span>→</span>
          </button>
        )}
      </div>
    </div>
  );
}

