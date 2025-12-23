"use client";

import type { BuilderState } from "../../types";

type RiepilogoStepProps = {
  state: BuilderState;
  onSetTitolo: (titolo: string) => void;
};

export function RiepilogoStep({ state, onSetTitolo }: RiepilogoStepProps) {
  const totalDurata = state.moduli.reduce((sum, m) => sum + (m.durata || 0), 0);
  const totalCapacita = state.moduli.reduce(
    (sum, m) => sum + m.capacita.length,
    0
  );
  const totalConoscenze = state.moduli.reduce(
    (sum, m) => sum + m.conoscenze.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Riepilogo Percorso Formativo</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifica le informazioni e assegna un titolo al percorso
        </p>
      </div>

      {/* Title input */}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="titolo">
          Titolo del Percorso *
        </label>
        <input
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          id="titolo"
          onChange={(e) => onSetTitolo(e.target.value)}
          placeholder="Es. Percorso Operatore Socio-Sanitario"
          type="text"
          value={state.titolo}
        />
        {state.titolo.trim().length === 0 && (
          <p className="text-xs text-destructive">
            Il titolo è obbligatorio per creare il percorso
          </p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Durata Totale"
          value={`${totalDurata} ore`}
        />
        <SummaryCard label="Moduli" value={state.moduli.length.toString()} />
        <SummaryCard label="Capacità" value={totalCapacita.toString()} />
        <SummaryCard label="Conoscenze" value={totalConoscenze.toString()} />
      </div>

      {/* Details */}
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Settore
          </h4>
          <p className="mt-1 text-sm capitalize">{state.selectedSettore}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Figura Professionale
          </h4>
          <p className="mt-1 text-sm">{state.selectedFigura}</p>
          {state.selectedFiguraDescrizione && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {state.selectedFiguraDescrizione}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Moduli Formativi ({state.moduli.length})
          </h4>
          <div className="mt-2 space-y-2">
            {state.moduli.map((modulo, index) => (
              <div
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
                key={modulo.id}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm line-clamp-1">{modulo.adaName}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {modulo.durata} ore
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

