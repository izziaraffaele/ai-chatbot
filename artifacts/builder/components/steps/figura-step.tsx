"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Import the JSON data directly
import figurePerSettoreData from "@/data/output/figureProfessionali Regione Toscana/figure_per_settore.json";
import type { FiguraProfessionale } from "../../types";

type FiguraStepProps = {
  settore: string;
  selected: string | null;
  onSelect: (figura: { nome: string; descrizione: string }) => void;
};

export function FiguraStep({ settore, selected, onSelect }: FiguraStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFigura, setExpandedFigura] = useState<string | null>(null);

  const figurePerSettore = figurePerSettoreData as Record<
    string,
    FiguraProfessionale[]
  >;
  const figure = figurePerSettore[settore] || [];

  const filteredFigure = figure.filter((figura) =>
    figura.denominazione_figura
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Seleziona la Figura Professionale</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Settore: <span className="font-medium capitalize">{settore}</span>
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca figura professionale..."
          type="text"
          value={searchTerm}
        />
      </div>

      {/* Figure list */}
      <div className="space-y-3">
        {filteredFigure.map((figura) => {
          const isSelected = selected === figura.denominazione_figura;
          const isExpanded = expandedFigura === figura.denominazione_figura;

          return (
            <div
              className={cn(
                "rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              )}
              key={figura.denominazione_figura}
            >
              <button
                className="flex w-full items-start justify-between p-4 text-left"
                onClick={() =>
                  onSelect({
                    nome: figura.denominazione_figura,
                    descrizione: figura.descrizione,
                  })
                }
                type="button"
              >
                <span className="pr-4 text-sm font-medium">
                  {figura.denominazione_figura}
                </span>
                {isSelected && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Selezionato
                  </span>
                )}
              </button>

              {/* Toggle description button */}
              <button
                className="w-full border-t border-border/50 px-4 py-2 text-left text-xs text-muted-foreground hover:bg-muted/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedFigura(
                    isExpanded ? null : figura.denominazione_figura
                  );
                }}
                type="button"
              >
                {isExpanded ? "Nascondi descrizione ↑" : "Mostra descrizione ↓"}
              </button>

              {/* Description */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-muted/30 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {figura.descrizione}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredFigure.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nessuna figura professionale trovata per &quot;{searchTerm}&quot;
        </p>
      )}
    </div>
  );
}

