"use client";

import equal from "fast-deep-equal";
import {
  CheckCircle2,
  Database,
  Loader2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatToolProps } from "./types";

// ============================================================================
// Types
// ============================================================================

type Step = "receiving" | "embedding" | "searching" | "ranking" | "complete";

interface StepConfig {
  id: Step;
  label: string;
  icon: LucideIcon;
  description?: string; // Static description, dynamic content handled separately
}

// ============================================================================
// Constants
// ============================================================================

const STEP_DURATION = 1200; // Time per step in ms
const RESULT_COUNT_SPEED = 100; // Time per result increment in ms
const MAX_RESULTS = 5; // Total results to display

const STEPS: StepConfig[] = [
  { id: "receiving", label: "Receiving query", icon: Search },
  {
    id: "embedding",
    label: "Creating embeddings",
    icon: Loader2,
    description: "Converting text to vectors...",
  },
  {
    id: "searching",
    label: "Searching vectors",
    icon: Database,
    description: "Searching H-FARM catalog...",
  },
  {
    id: "ranking",
    label: "Ranking results",
    icon: Loader2,
    description: "Sorting by relevance...",
  },
  { id: "complete", label: "Complete", icon: CheckCircle2 },
];

const STEP_ORDER: Step[] = [
  "receiving",
  "embedding",
  "searching",
  "ranking",
  "complete",
];

// ============================================================================
// Helper Functions
// ============================================================================

function getStepIndex(step: Step): number {
  return STEP_ORDER.indexOf(step);
}

// ============================================================================
// Component
// ============================================================================

/**
 * HFarmCatalogTool - Minimalist Progress Widget
 *
 * Displays a step-by-step progress indicator for the semantic search process
 * with smooth animations and the Memoraiz cyan color theme.
 */
function PureHFarmCatalogTool({ part }: ChatToolProps) {
  const [currentStep, setCurrentStep] = useState<Step>("receiving");
  const [results, setResults] = useState(0);

  // Get the queries from tool input for display
  const queries = useMemo(() => {
    const input = part.input as { queries?: string[] } | undefined;
    return input?.queries ?? [];
  }, [part.input]);

  // Get the actual result count from tool output
  const actualResultCount = useMemo(() => {
    const output = part.output as { totalUniqueResults?: number } | undefined;
    return output?.totalUniqueResults ?? null;
  }, [part.output]);

  // Create a signature to detect when the tool call changes
  const toolSignature = useMemo(() => {
    return `${part.toolCallId}:${JSON.stringify(queries)}`;
  }, [part.toolCallId, queries]);

  // Get current step index for progress calculation
  const currentStepIndex = getStepIndex(currentStep);

  // Calculate progress percentage
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Check if tool output is already available (skip animation)
  const hasOutput = part.state === "output-available" && actualResultCount !== null;

  // Reset and run animation when tool call changes
  useEffect(() => {
    // If output is already available, skip to complete immediately
    if (hasOutput) {
      setCurrentStep("complete");
      setResults(actualResultCount ?? MAX_RESULTS);
      return;
    }

    // Reset state for animation
    setCurrentStep("receiving");
    setResults(0);

    let stepIndex = 0;
    let resultInterval: ReturnType<typeof setInterval> | null = null;

    const stepInterval = setInterval(() => {
      stepIndex += 1;

      if (stepIndex < STEP_ORDER.length) {
        const nextStep = STEP_ORDER[stepIndex];
        setCurrentStep(nextStep);

        // Start counting results when reaching ranking step
        if (nextStep === "ranking") {
          let count = 0;
          resultInterval = setInterval(() => {
            count += 1;
            setResults(count);
            if (count >= MAX_RESULTS && resultInterval) {
              clearInterval(resultInterval);
              resultInterval = null;
            }
          }, RESULT_COUNT_SPEED);
        }
      } else {
        clearInterval(stepInterval);
      }
    }, STEP_DURATION);

    return () => {
      clearInterval(stepInterval);
      if (resultInterval) {
        clearInterval(resultInterval);
      }
    };
  }, [toolSignature, hasOutput]);

  // Get the description for a step (dynamic for receiving, static for others)
  const getStepDescription = useCallback(
    (step: StepConfig): string | null => {
      if (step.id === "receiving") {
        // Show the actual queries for the receiving step
        if (queries.length === 0) return null;
        if (queries.length === 1) return `"${queries[0]}"`;
        return queries.map((q) => `"${q}"`).join(", ");
      }
      return step.description ?? null;
    },
    [queries]
  );

  // Render step item
  const renderStep = useCallback(
    (step: StepConfig, index: number) => {
      const isActive = step.id === currentStep;
      const isComplete = index < currentStepIndex;
      const isFuture = index > currentStepIndex;

      const IconComponent = step.icon;
      const shouldSpin =
        isActive && (step.icon === Loader2 || step.id === "receiving");

      const description = getStepDescription(step);
      const showDescription = description && (isActive || isComplete);

      return (
        <li
          className={cn(
            "flex items-center justify-between gap-3 transition-opacity duration-300",
            isFuture ? "opacity-40" : "opacity-100"
          )}
          key={step.id}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {/* Step circle with icon */}
            <div
              aria-hidden="true"
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                {
                  "bg-gray-100": isFuture,
                  "bg-hf-cyan/10": isActive,
                  "bg-hf-cyan": isComplete,
                }
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="size-4 text-white" />
              ) : (
                <IconComponent
                  className={cn("size-3.5 transition-colors duration-300", {
                    "text-gray-400": isFuture,
                    "text-hf-cyan": isActive,
                    "animate-spin": shouldSpin,
                  })}
                />
              )}
            </div>

            {/* Step label and description */}
            <div className="min-w-0 flex-1">
              <span
                className={cn("block text-sm transition-colors duration-300", {
                  "text-gray-400": isFuture,
                  "text-hf-deep-blue": isActive,
                  "text-hf-deep-blue/70": isComplete,
                })}
              >
                {step.label}
              </span>
              {showDescription && (
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs transition-all duration-300",
                    {
                      "text-hf-deep-blue/50": isActive,
                      "text-hf-deep-blue/40": isComplete,
                    }
                  )}
                  title={description}
                >
                  {description}
                </span>
              )}
            </div>
          </div>

          {/* Result badge - show on ranking step when active/complete */}
          {step.id === "ranking" && (isActive || isComplete) && (results > 0 || actualResultCount) && (
            <div className="shrink-0 rounded-lg bg-hf-cyan/10 px-2 py-1 text-hf-cyan text-xs">
              {actualResultCount ?? results} found
            </div>
          )}
        </li>
      );
    },
    [currentStep, currentStepIndex, results, actualResultCount, getStepDescription]
  );

  return (
    <div
      className="w-full rounded-2xl border border-hf-cyan/20 bg-white p-6 shadow-sm"
      data-slot="hfarm-catalog-tool"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-xl bg-hf-cyan/10"
        >
          <Search className="size-4 text-hf-cyan" />
        </div>
        <span className="text-hf-deep-blue/70 text-sm">
          Searching knowledge base
        </span>
      </div>

      {/* Progress bar */}
      <div
        aria-label="Search progress"
        aria-valuemax={STEPS.length}
        aria-valuemin={1}
        aria-valuenow={currentStepIndex + 1}
        className="mb-6 h-2 w-full overflow-hidden rounded-full bg-hf-cyan/10"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-hf-cyan to-hf-cyan-light transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps list */}
      <ul className="space-y-3">{STEPS.map(renderStep)}</ul>

      {/* Completion message - show actual result count when available */}
      {currentStep === "complete" && (
        <div className="mt-4 rounded-xl border border-hf-cyan/20 bg-hf-cyan/5 p-3">
          <p className="text-center text-hf-deep-blue text-sm">
            Found {actualResultCount ?? results} relevant documents
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized HFarmCatalogTool component to prevent unnecessary re-renders.
 * Uses deep equality for part comparison.
 */
export const HFarmCatalogTool = memo(PureHFarmCatalogTool, (prev, next) => {
  return equal(prev.part, next.part);
});

HFarmCatalogTool.displayName = "HFarmCatalogTool";

