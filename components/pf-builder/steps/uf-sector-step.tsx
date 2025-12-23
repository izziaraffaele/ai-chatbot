"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UsePFBuilderReturn } from "@/hooks/use-pf-builder";
import { useTranslations } from "@/lib/i18n/use-translations";
import { loadSettori } from "@/lib/pf-builder/data-loader";
import { cn } from "@/lib/utils";

type UfSectorStepProps = {
  builder: UsePFBuilderReturn;
  onBack: () => void;
  onNext: () => void;
};

/**
 * UfSectorStep - Batch step for selecting a settore for each UF
 * All UFs must have a sector assigned before proceeding
 */
export function UfSectorStep({ builder, onBack, onNext }: UfSectorStepProps) {
  const t = useTranslations();
  const { state, setUfSector, canProceedFromSectors } = builder;

  const [settori, setSettori] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  // Load settori on mount
  useEffect(() => {
    setIsLoading(true);
    loadSettori()
      .then((data) => {
        setSettori(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          t("pfBuilder.sector.loadError", "Errore nel caricamento dei settori")
        );
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [t]);

  const handleNext = () => {
    if (!canProceedFromSectors) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    onNext();
  };

  const handleSectorChange = (ufId: string, settore: string) => {
    setUfSector(ufId, settore);
    // Clear validation error when user makes a selection
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  // Count UFs without sectors for validation message
  const ufsWithoutSector = state.unitaFormative.filter(
    (uf) => !uf.settore
  ).length;

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-semibold text-xl">
          {t("pfBuilder.sector.title", "Seleziona i Settori")}
        </h2>
        <p className="text-muted-foreground">
          {t(
            "pfBuilder.sector.description",
            "Assegna un settore a ogni Unità Formativa"
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

      {/* UF List with sector selects */}
      {!isLoading && !error && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {state.unitaFormative.map((uf) => {
            const hasSector = uf.settore !== null;

            return (
              <div
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  hasSector
                    ? "border-green-500/30 bg-green-500/5"
                    : showValidationError
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border bg-card"
                )}
                key={uf.id}
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 pt-1">
                    {hasSector ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
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

                  {/* UF info and select */}
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-2 truncate font-medium">{uf.nome}</h4>

                    <Select
                      onValueChange={(value) =>
                        handleSectorChange(uf.id, value)
                      }
                      value={uf.settore ?? undefined}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full",
                          !hasSector &&
                            showValidationError &&
                            "border-destructive"
                        )}
                        data-testid="pf-sector-select"
                      >
                        <SelectValue
                          placeholder={t(
                            "pfBuilder.sector.selectPlaceholder",
                            "Seleziona settore..."
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {settori.map((settore) => (
                          <SelectItem
                            className="capitalize"
                            key={settore}
                            value={settore}
                          >
                            {settore}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {state.unitaFormative.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-border border-dashed">
              <p className="text-center text-muted-foreground">
                {t(
                  "pfBuilder.sector.noUf",
                  "Nessuna Unità Formativa da configurare"
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Validation error message */}
      {showValidationError && ufsWithoutSector > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {ufsWithoutSector === 1
              ? t(
                  "pfBuilder.sector.validationErrorSingular",
                  "Seleziona un settore per l'Unità Formativa rimanente"
                )
              : t(
                  "pfBuilder.sector.validationError",
                  `Seleziona un settore per tutte le ${ufsWithoutSector} Unità Formative rimanenti`
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
