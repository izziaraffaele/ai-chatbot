"use client";

import type { BuilderState } from "../../types";

type CompletedStepProps = {
  state: BuilderState;
};

export function CompletedStep({ state }: CompletedStepProps) {
  const totalDurata = state.moduli.reduce((sum, m) => sum + (m.durata || 0), 0);

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-6 py-12">
      {/* Success icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-10 w-10 text-green-600 dark:text-green-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold">Percorso Creato!</h3>
        <p className="mt-2 text-muted-foreground">
          Il tuo percorso formativo è stato creato con successo
        </p>
      </div>

      {/* Summary */}
      <div className="w-full max-w-md rounded-lg border border-border bg-muted/30 p-6 space-y-4">
        <div>
          <h4 className="text-lg font-semibold">{state.titolo}</h4>
          <p className="text-sm text-muted-foreground capitalize">
            {state.selectedSettore}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-primary">
              {state.moduli.length}
            </p>
            <p className="text-xs text-muted-foreground">Moduli</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{totalDurata}</p>
            <p className="text-xs text-muted-foreground">Ore</p>
          </div>
          <div>
            <p className="text-xl font-bold text-primary">
              {state.moduli.reduce((sum, m) => sum + m.capacita.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Competenze</p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Figura professionale: {state.selectedFigura}
          </p>
        </div>
      </div>

      {/* Next steps hint */}
      <p className="text-center text-sm text-muted-foreground">
        Puoi continuare la conversazione per modificare il percorso o generare
        materiali didattici
      </p>
    </div>
  );
}

