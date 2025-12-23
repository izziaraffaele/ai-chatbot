"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Import the JSON data directly
import adaPerFiguraData from "@/data/output/figureProfessionali Regione Toscana/ada_per_figura.json";
import dettagliAdaData from "@/data/output/figureProfessionali Regione Toscana/dettagli_ada.json";
import type { Ada, DettagliAda } from "../../types";

type AdaStepProps = {
  figura: string;
  selected: string[];
  onToggle: (adaId: string) => void;
};

export function AdaStep({ figura, selected, onToggle }: AdaStepProps) {
  const [expandedAda, setExpandedAda] = useState<string | null>(null);

  const adaPerFigura = adaPerFiguraData as Record<string, Ada[]>;
  const dettagliAda = dettagliAdaData as Record<string, DettagliAda>;
  
  const adaList = adaPerFigura[figura] || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Seleziona le Aree di Attività (ADA)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleziona le competenze da includere nel percorso formativo.
          {selected.length > 0 && (
            <span className="ml-2 font-medium text-primary">
              {selected.length} selezionat{selected.length === 1 ? "a" : "e"}
            </span>
          )}
        </p>
      </div>

      {/* ADA list */}
      <div className="space-y-3">
        {adaList.map((ada) => {
          const isSelected = selected.includes(ada.denominazione_ada);
          const isExpanded = expandedAda === ada.denominazione_ada;
          const dettagli = dettagliAda[ada.denominazione_ada];

          return (
            <div
              className={cn(
                "rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
              key={ada.denominazione_ada}
            >
              {/* Main button */}
              <button
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => onToggle(ada.denominazione_ada)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox indicator */}
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">
                      {ada.denominazione_ada}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      (UC: {ada.uc})
                    </span>
                  </div>
                </div>
              </button>

              {/* Toggle details button */}
              {dettagli && (
                <button
                  className="w-full border-t border-border/50 px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedAda(isExpanded ? null : ada.denominazione_ada);
                  }}
                  type="button"
                >
                  {isExpanded
                    ? "Nascondi dettagli ↑"
                    : `Mostra dettagli (${dettagli.capacita.length} capacità, ${dettagli.conoscenze.length} conoscenze) ↓`}
                </button>
              )}

              {/* Details */}
              {isExpanded && dettagli && (
                <div className="border-t border-border/50 bg-muted/30 p-4 space-y-4">
                  {/* Capacità */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                      Capacità
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {dettagli.capacita.map((capacita, idx) => (
                        <li
                          className="flex items-start gap-2 text-sm"
                          key={idx}
                        >
                          <span className="text-primary">•</span>
                          <span>{capacita}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Conoscenze */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                      Conoscenze
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {dettagli.conoscenze.map((conoscenza, idx) => (
                        <li
                          className="flex items-start gap-2 text-sm"
                          key={idx}
                        >
                          <span className="text-muted-foreground">•</span>
                          <span>{conoscenza}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adaList.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nessuna ADA disponibile per questa figura professionale
        </p>
      )}
    </div>
  );
}

