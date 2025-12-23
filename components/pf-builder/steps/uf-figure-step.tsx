"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UsePFBuilderReturn } from "@/hooks/use-pf-builder";
import { useTranslations } from "@/lib/i18n/use-translations";
import { loadFigurePerSettore } from "@/lib/pf-builder/data-loader";
import type { FiguraProfessionale } from "@/lib/pf-builder/types";
import { cn } from "@/lib/utils";

type UfFigureStepProps = {
  builder: UsePFBuilderReturn;
  onBack: () => void;
  onNext: () => void;
};

/**
 * UfFigureStep - Batch step for selecting a figura professionale for each UF
 * All UFs must have a figure assigned before proceeding
 */
export function UfFigureStep({ builder, onBack, onNext }: UfFigureStepProps) {
  const t = useTranslations();
  const { state, setUfFigure, canProceedFromFigures } = builder;

  // Store all figures per settore for quick lookup
  const [figurePerSettore, setFigurePerSettore] = useState<
    Record<string, FiguraProfessionale[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  // Track which UF's popover is open
  const [openPopoverUfId, setOpenPopoverUfId] = useState<string | null>(null);

  // Track expanded descriptions per UF
  const [expandedUfId, setExpandedUfId] = useState<string | null>(null);

  // Load all figures per settore on mount
  useEffect(() => {
    setIsLoading(true);
    loadFigurePerSettore()
      .then((data) => {
        setFigurePerSettore(data);
        setError(null);
      })
      .catch((err) => {
        setError(
          t("pfBuilder.figure.loadError", "Errore nel caricamento delle figure")
        );
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [t]);

  const handleNext = () => {
    if (!canProceedFromFigures) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    onNext();
  };

  const handleFigureSelect = (ufId: string, figura: FiguraProfessionale) => {
    setUfFigure(ufId, figura.denominazione_figura, figura.descrizione);
    setOpenPopoverUfId(null);
    // Clear validation error when user makes a selection
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  // Count UFs without figures for validation message
  const ufsWithoutFigure = state.unitaFormative.filter(
    (uf) => !uf.figura
  ).length;

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-semibold text-xl">
          {t("pfBuilder.figure.title", "Seleziona le Figure Professionali")}
        </h2>
        <p className="text-muted-foreground">
          {t(
            "pfBuilder.figure.description",
            "Assegna una figura professionale a ogni Unità Formativa"
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

      {/* UF List with figure selects */}
      {!isLoading && !error && (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {state.unitaFormative.map((uf) => {
            const hasFigure = uf.figura !== null;
            const figures = uf.settore
              ? (figurePerSettore[uf.settore] ?? [])
              : [];
            const hasFiguresAvailable = figures.length > 0;
            const isPopoverOpen = openPopoverUfId === uf.id;
            const isExpanded = expandedUfId === uf.id;

            // Find the selected figure object for description
            const selectedFigure = figures.find(
              (f) => f.denominazione_figura === uf.figura
            );

            return (
              <div
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  hasFigure
                    ? "border-green-500/30 bg-green-500/5"
                    : hasFiguresAvailable
                      ? showValidationError
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border bg-card"
                      : "border-amber-500/50 bg-amber-500/5"
                )}
                key={uf.id}
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 pt-1">
                    {hasFigure ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle
                        className={cn(
                          "h-5 w-5",
                          hasFiguresAvailable
                            ? showValidationError
                              ? "text-destructive"
                              : "text-amber-500"
                            : "text-amber-500"
                        )}
                      />
                    )}
                  </div>

                  {/* UF info and select */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="truncate font-medium">{uf.nome}</h4>
                      <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs capitalize">
                        {uf.settore}
                      </span>
                    </div>

                    {/* Edge case: No figures available for sector */}
                    {!hasFiguresAvailable && uf.settore && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="text-amber-700 text-sm dark:text-amber-300">
                          {t(
                            "pfBuilder.errors.noFiguresForSector",
                            `Nessuna figura professionale disponibile per il settore '${uf.settore}'. Seleziona un altro settore.`
                          ).replace("{sector}", uf.settore)}
                        </p>
                      </div>
                    )}

                    {/* Figure Combobox - only show if figures are available */}
                    {hasFiguresAvailable && (
                      <Popover
                        onOpenChange={(open: boolean) =>
                          setOpenPopoverUfId(open ? uf.id : null)
                        }
                        open={isPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            aria-expanded={isPopoverOpen}
                            className={cn(
                              "w-full justify-between text-left font-normal",
                              !hasFigure &&
                                showValidationError &&
                                "border-destructive",
                              !hasFigure && "text-muted-foreground"
                            )}
                            data-testid="pf-figure-select"
                            role="combobox"
                            type="button"
                            variant="outline"
                          >
                            <span className="truncate">
                              {uf.figura ??
                                t(
                                  "pfBuilder.figure.selectPlaceholder",
                                  "Seleziona figura professionale..."
                                )}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                        >
                          <Command>
                            <CommandInput
                              placeholder={t(
                                "pfBuilder.figure.searchPlaceholder",
                                "Cerca figura..."
                              )}
                            />
                            <CommandList className="max-h-[300px]">
                              <CommandEmpty>
                                {t(
                                  "pfBuilder.figure.noResults",
                                  "Nessuna figura trovata"
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                {figures.map((figura) => (
                                  <CommandItem
                                    key={figura.denominazione_figura}
                                    onSelect={() =>
                                      handleFigureSelect(uf.id, figura)
                                    }
                                    value={figura.denominazione_figura}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        uf.figura ===
                                          figura.denominazione_figura
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm">
                                        {figura.denominazione_figura}
                                      </div>
                                      <div className="line-clamp-1 text-muted-foreground text-xs">
                                        {figura.descrizione}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}

                    {/* Show figure description when selected */}
                    {selectedFigure && (
                      <div className="mt-2">
                        <button
                          className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                          onClick={() =>
                            setExpandedUfId(isExpanded ? null : uf.id)
                          }
                          type="button"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                          {isExpanded
                            ? t(
                                "pfBuilder.figure.hideDescription",
                                "Nascondi descrizione"
                              )
                            : t(
                                "pfBuilder.figure.showDescription",
                                "Mostra descrizione"
                              )}
                        </button>
                        {isExpanded && (
                          <p className="mt-2 text-muted-foreground text-sm">
                            {selectedFigure.descrizione}
                          </p>
                        )}
                      </div>
                    )}
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
                  "pfBuilder.figure.noUf",
                  "Nessuna Unità Formativa da configurare"
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Validation error message */}
      {showValidationError && ufsWithoutFigure > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {ufsWithoutFigure === 1
              ? t(
                  "pfBuilder.figure.validationErrorSingular",
                  "Seleziona una figura per l'Unità Formativa rimanente"
                )
              : t(
                  "pfBuilder.figure.validationError",
                  `Seleziona una figura per tutte le ${ufsWithoutFigure} Unità Formative rimanenti`
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
