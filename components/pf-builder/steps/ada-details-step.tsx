"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  FileQuestion,
  Search,
  Square,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n/use-translations";
import { getDettagliByAda } from "@/lib/pf-builder/data-loader";
import type { DettagliAda, SelectedAdaDetails } from "@/lib/pf-builder/types";
import { PF_VALIDATION } from "@/lib/pf-builder/types";
import { cn } from "@/lib/utils";

type AdaDetailsStepProps = {
  ufName: string;
  ada: SelectedAdaDetails;
  adaIndex: number;
  totalAda: number;
  onToggleCapacita: (capacita: string, selected: boolean) => void;
  onToggleConoscenza: (conoscenza: string, selected: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string>;
};

/**
 * AdaDetailsStep - Step for selecting capacità and conoscenze for an ADA
 * Includes search/filter functionality for long lists
 */
export function AdaDetailsStep({
  ufName,
  ada,
  adaIndex,
  totalAda,
  onToggleCapacita,
  onToggleConoscenza,
  onNext,
  onBack,
  errors,
}: AdaDetailsStepProps) {
  const t = useTranslations();
  const [dettagli, setDettagli] = useState<DettagliAda | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track if ADA details were not found (null from API, not an error)
  const [detailsNotFound, setDetailsNotFound] = useState(false);

  // Filter states for search functionality
  const [capacitaFilter, setCapacitaFilter] = useState("");
  const [conoscenzeFilter, setConoscenzeFilter] = useState("");

  // Reset filters when ADA changes
  useEffect(() => {
    setCapacitaFilter("");
    setConoscenzeFilter("");
    setDetailsNotFound(false);
  }, [ada.adaId]);

  // Load dettagli on mount or when ada changes
  useEffect(() => {
    if (!ada.adaId) return;

    setIsLoading(true);
    setDetailsNotFound(false);
    getDettagliByAda(ada.adaId)
      .then((data) => {
        if (data === null) {
          // ADA not found in dettagli_ada.json - this is an edge case, not an error
          setDetailsNotFound(true);
          setDettagli(null);
          console.warn(`ADA details not found for: ${ada.adaId}`);
        } else {
          setDettagli(data);
        }
        setError(null);
      })
      .catch((err) => {
        setError(
          t(
            "pfBuilder.errors.dataLoadFailed",
            "Errore nel caricamento dei dati. Riprova più tardi."
          )
        );
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [ada.adaId, t]);

  // Filtered lists based on search queries
  const filteredCapacita = useMemo(() => {
    if (!dettagli) return [];
    if (!capacitaFilter.trim()) return dettagli.capacita;
    const query = capacitaFilter.toLowerCase();
    return dettagli.capacita.filter((cap) => cap.toLowerCase().includes(query));
  }, [dettagli, capacitaFilter]);

  const filteredConoscenze = useMemo(() => {
    if (!dettagli) return [];
    if (!conoscenzeFilter.trim()) return dettagli.conoscenze;
    const query = conoscenzeFilter.toLowerCase();
    return dettagli.conoscenze.filter((con) =>
      con.toLowerCase().includes(query)
    );
  }, [dettagli, conoscenzeFilter]);

  const capacitaCount = ada.selectedCapacita.length;
  const conoscenzeCount = ada.selectedConoscenze.length;
  const isCapacitaValid = capacitaCount >= PF_VALIDATION.MIN_CAPACITA;
  const isConoscenzeValid = conoscenzeCount >= PF_VALIDATION.MIN_CONOSCENZE;
  // Allow proceeding if details not found (graceful fallback)
  const isValid = detailsNotFound || (isCapacitaValid && isConoscenzeValid);
  const isLastAda = adaIndex === totalAda - 1;

  return (
    <div className="flex h-full flex-col p-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <button
          className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          {adaIndex === 0 ? "Torna alle ADA" : "ADA precedente"}
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-muted px-2 py-1 font-medium text-muted-foreground text-xs">
            ADA {adaIndex + 1} di {totalAda}
          </span>
        </div>
        <h2 className="font-semibold text-xl">{ada.adaName}</h2>
        <p className="text-muted-foreground text-sm">
          UF: <span className="font-medium text-foreground">{ufName}</span>
          {ada.uc && (
            <>
              {" • "}
              UC: <span className="font-medium text-foreground">{ada.uc}</span>
            </>
          )}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex h-32 flex-col items-center justify-center text-destructive">
            <p>{error}</p>
            <Button
              className="mt-2"
              onClick={() => window.location.reload()}
              size="sm"
              type="button"
              variant="outline"
            >
              Riprova
            </Button>
          </div>
        )}

        {/* Edge case: ADA details not found in catalog */}
        {!isLoading && !error && detailsNotFound && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 p-8 text-center">
            <FileQuestion className="mb-4 h-12 w-12 text-amber-500" />
            <h3 className="mb-2 font-semibold text-lg">
              {t(
                "pfBuilder.adaDetails.emptyStateTitle",
                "Dettagli non disponibili"
              )}
            </h3>
            <p className="mb-4 max-w-md text-amber-700 text-sm dark:text-amber-300">
              {t(
                "pfBuilder.adaDetails.emptyStateDescription",
                "I dettagli per questa ADA non sono disponibili nel catalogo. Puoi procedere comunque."
              )}
            </p>
            <p className="text-muted-foreground text-xs">ADA: {ada.adaName}</p>
          </div>
        )}

        {!isLoading && !error && dettagli && !detailsNotFound && (
          <div className="space-y-8">
            {/* Capacità Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Capacità</h3>
                <span
                  className={cn(
                    "text-sm",
                    isCapacitaValid ? "text-green-600" : "text-amber-600"
                  )}
                >
                  {capacitaCount}/{dettagli.capacita.length} selezionate
                  {!isCapacitaValid && ` (min ${PF_VALIDATION.MIN_CAPACITA})`}
                </span>
              </div>

              {/* Search input for Capacità */}
              <div className="relative mb-3">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-9 pl-9"
                  onChange={(e) => setCapacitaFilter(e.target.value)}
                  placeholder="Cerca capacità..."
                  type="text"
                  value={capacitaFilter}
                />
                {capacitaFilter && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setCapacitaFilter("")}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter indicator */}
              {capacitaFilter && (
                <p className="mb-2 text-muted-foreground text-xs">
                  {filteredCapacita.length} di {dettagli.capacita.length}{" "}
                  risultati
                </p>
              )}

              {errors.capacita && (
                <div className="mb-2 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errors.capacita}
                </div>
              )}

              {/* Scrollable list container */}
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {filteredCapacita.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    Nessun risultato per "{capacitaFilter}"
                  </p>
                ) : (
                  filteredCapacita.map((cap) => {
                    const isSelected = ada.selectedCapacita.includes(cap);
                    return (
                      <button
                        className={cn(
                          "w-full rounded-lg border p-3 text-left text-sm transition-all",
                          "hover:border-primary/50",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card"
                        )}
                        data-testid="pf-capacita-item"
                        key={cap}
                        onClick={() => onToggleCapacita(cap, !isSelected)}
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          {isSelected ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span>{cap}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Conoscenze Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Conoscenze</h3>
                <span
                  className={cn(
                    "text-sm",
                    isConoscenzeValid ? "text-green-600" : "text-amber-600"
                  )}
                >
                  {conoscenzeCount}/{dettagli.conoscenze.length} selezionate
                  {!isConoscenzeValid &&
                    ` (min ${PF_VALIDATION.MIN_CONOSCENZE})`}
                </span>
              </div>

              {/* Search input for Conoscenze */}
              <div className="relative mb-3">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-9 pl-9"
                  onChange={(e) => setConoscenzeFilter(e.target.value)}
                  placeholder="Cerca conoscenze..."
                  type="text"
                  value={conoscenzeFilter}
                />
                {conoscenzeFilter && (
                  <button
                    className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setConoscenzeFilter("")}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter indicator */}
              {conoscenzeFilter && (
                <p className="mb-2 text-muted-foreground text-xs">
                  {filteredConoscenze.length} di {dettagli.conoscenze.length}{" "}
                  risultati
                </p>
              )}

              {errors.conoscenze && (
                <div className="mb-2 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {errors.conoscenze}
                </div>
              )}

              {/* Scrollable list container */}
              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {filteredConoscenze.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    Nessun risultato per "{conoscenzeFilter}"
                  </p>
                ) : (
                  filteredConoscenze.map((con) => {
                    const isSelected = ada.selectedConoscenze.includes(con);
                    return (
                      <button
                        className={cn(
                          "w-full rounded-lg border p-3 text-left text-sm transition-all",
                          "hover:border-primary/50",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card"
                        )}
                        data-testid="pf-conoscenza-item"
                        key={con}
                        onClick={() => onToggleConoscenza(con, !isSelected)}
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          {isSelected ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span>{con}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-end border-border border-t pt-4">
        <Button
          data-testid="pf-next-button"
          disabled={!isValid}
          onClick={onNext}
          type="button"
        >
          {detailsNotFound
            ? t("pfBuilder.adaDetails.proceedAnyway", "Procedi comunque")
            : isLastAda
              ? t("pfBuilder.summary.complete", "Completa UF")
              : t("common.next", "Prossima ADA")}
        </Button>
      </div>
    </div>
  );
}
