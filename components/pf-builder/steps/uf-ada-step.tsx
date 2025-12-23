"use client";

import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { UsePFBuilderReturn } from "@/hooks/use-pf-builder";
import { useTranslations } from "@/lib/i18n/use-translations";
import { loadAdaPerFigura } from "@/lib/pf-builder/data-loader";
import type { Ada } from "@/lib/pf-builder/types";
import { PF_VALIDATION } from "@/lib/pf-builder/types";
import { cn } from "@/lib/utils";

type UfAdaStepProps = {
  builder: UsePFBuilderReturn;
  onBack: () => void;
  onNext: () => void;
};

/**
 * UfAdaStep - Batch step for selecting ADAs for each UF
 * All UFs must have at least one ADA assigned before proceeding
 */
export function UfAdaStep({ builder, onBack, onNext }: UfAdaStepProps) {
  const t = useTranslations();
  const { state, toggleUfAda, canProceedFromAda } = builder;

  // Store all ADAs per figura for quick lookup
  const [adaPerFigura, setAdaPerFigura] = useState<Record<string, Ada[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  // Track which UF's ADA list is expanded
  const [expandedUfId, setExpandedUfId] = useState<string | null>(null);

  // Load all ADA per figura on mount
  useEffect(() => {
    setIsLoading(true);
    loadAdaPerFigura()
      .then((data) => {
        setAdaPerFigura(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          t("pfBuilder.ada.loadError", "Errore nel caricamento delle ADA")
        );
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [t]);

  const handleNext = () => {
    if (!canProceedFromAda) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    onNext();
  };

  const handleAdaToggle = (ufId: string, ada: Ada) => {
    toggleUfAda(ufId, ada.denominazione_ada, ada.denominazione_ada, ada.uc);
    // Clear validation error when user makes a selection
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  // Count UFs without ADA for validation message
  const ufsWithoutAda = state.unitaFormative.filter(
    (uf) => uf.adaList.length < PF_VALIDATION.MIN_ADA_PER_UF
  ).length;

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-semibold text-xl">
          {t("pfBuilder.ada.title", "Seleziona le Aree di Attività (ADA)")}
        </h2>
        <p className="text-muted-foreground">
          {t(
            "pfBuilder.ada.description",
            "Assegna almeno un'ADA a ogni Unità Formativa"
          )}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center text-destructive">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p>{error}</p>
          <Button
            className="mt-4"
            onClick={() => window.location.reload()}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("common.retry", "Riprova")}
          </Button>
        </div>
      )}

      {/* UF List with ADA checkboxes */}
      {!isLoading && !error && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {state.unitaFormative.map((uf) => {
            const hasAda = uf.adaList.length >= PF_VALIDATION.MIN_ADA_PER_UF;
            const adaList = uf.figura ? (adaPerFigura[uf.figura] ?? []) : [];
            const hasAdaAvailable = adaList.length > 0;
            const isExpanded = expandedUfId === uf.id;
            const selectedAdaIds = uf.adaList.map((a) => a.adaId);

            return (
              <div
                className={cn(
                  "rounded-lg border transition-all",
                  hasAda
                    ? "border-green-500/30 bg-green-500/5"
                    : !hasAdaAvailable && uf.figura
                      ? "border-amber-500/50 bg-amber-500/5"
                      : showValidationError
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border bg-card"
                )}
                key={uf.id}
              >
                {/* UF Header - clickable to expand/collapse */}
                <button
                  className="flex w-full items-center gap-4 p-4 text-left"
                  onClick={() => setExpandedUfId(isExpanded ? null : uf.id)}
                  type="button"
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {hasAda ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : !hasAdaAvailable && uf.figura ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <AlertCircle
                        className={cn(
                          "h-5 w-5",
                          showValidationError
                            ? "text-destructive"
                            : "text-amber-500"
                        )}
                      />
                    )}
                  </div>

                  {/* UF info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-medium">{uf.nome}</h4>
                      <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                        {uf.adaList.length} ADA
                      </span>
                      {!hasAdaAvailable && uf.figura && (
                        <span className="flex-shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-700 text-xs dark:text-amber-300">
                          {t(
                            "pfBuilder.ada.noAdaForFigure",
                            "Nessuna ADA disponibile"
                          )}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-muted-foreground text-sm">
                      {uf.figura}
                    </p>
                  </div>

                  {/* Expand/collapse indicator */}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* ADA List - shown when expanded */}
                {isExpanded && (
                  <div className="border-border border-t px-4 pb-4">
                    {adaList.length === 0 ? (
                      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-amber-500" />
                        <p className="text-amber-700 text-sm dark:text-amber-300">
                          {t(
                            "pfBuilder.errors.noAdaForFigure",
                            `Nessuna Area di Attività (ADA) disponibile per la figura '${uf.figura ?? ""}'. Seleziona un'altra figura professionale.`
                          ).replace("{figure}", uf.figura ?? "")}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {adaList.map((ada) => {
                          const isSelected = selectedAdaIds.includes(
                            ada.denominazione_ada
                          );

                          return (
                            <button
                              className={cn(
                                "w-full rounded-md border p-3 text-left transition-all",
                                "hover:border-primary/50",
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background"
                              )}
                              data-testid="pf-ada-item"
                              key={ada.denominazione_ada}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdaToggle(uf.id, ada);
                              }}
                              type="button"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm">
                                    {ada.denominazione_ada}
                                  </p>
                                  <p className="mt-0.5 text-muted-foreground text-xs">
                                    {t("pfBuilder.ada.ucCode", "Codice UC")}:{" "}
                                    {ada.uc}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {state.unitaFormative.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-border border-dashed">
              <p className="text-center text-muted-foreground">
                {t(
                  "pfBuilder.ada.noUf",
                  "Nessuna Unità Formativa da configurare"
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Validation error message */}
      {showValidationError && ufsWithoutAda > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {ufsWithoutAda === 1
              ? t(
                  "pfBuilder.ada.validationErrorSingular",
                  "Seleziona almeno un'ADA per l'Unità Formativa rimanente"
                )
              : t(
                  "pfBuilder.ada.validationError",
                  `Seleziona almeno un'ADA per tutte le ${ufsWithoutAda} Unità Formative rimanenti`
                )}
          </span>
        </div>
      )}

      {/* Footer with navigation */}
      <div className="mt-4 flex items-center justify-between border-border border-t pt-4">
        <Button
          data-testid="pf-back-button"
          onClick={onBack}
          type="button"
          variant="ghost"
        >
          {t("common.back", "Indietro")}
        </Button>
        <Button
          data-testid="pf-next-button"
          disabled={isLoading || Boolean(error)}
          onClick={handleNext}
          type="button"
        >
          {t("common.next", "Avanti")}
        </Button>
      </div>
    </div>
  );
}
