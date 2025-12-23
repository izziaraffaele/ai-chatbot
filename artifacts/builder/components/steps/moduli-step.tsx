"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

// Import the JSON data directly
import dettagliAdaData from "@/data/output/figureProfessionali Regione Toscana/dettagli_ada.json";
import type { DettagliAda, TrainingModule } from "../../types";

type ModuliStepProps = {
  selectedAda: string[];
  moduli: TrainingModule[];
  onSetModuli: (moduli: TrainingModule[]) => void;
  onUpdateModulo: (id: string, updates: Partial<TrainingModule>) => void;
};

export function ModuliStep({
  selectedAda,
  moduli,
  onSetModuli,
  onUpdateModulo,
}: ModuliStepProps) {
  const dettagliAda = dettagliAdaData as Record<string, DettagliAda>;

  // Initialize moduli from selected ADA if empty
  useEffect(() => {
    if (moduli.length === 0 && selectedAda.length > 0) {
      const initialModuli: TrainingModule[] = selectedAda.map(
        (adaName, index) => {
          const dettagli = dettagliAda[adaName];
          return {
            id: crypto.randomUUID(),
            adaId: adaName,
            adaName: adaName,
            capacita: dettagli?.capacita || [],
            conoscenze: dettagli?.conoscenze || [],
            durata: 8, // Default 8 hours
            ordine: index + 1,
          };
        }
      );
      onSetModuli(initialModuli);
    }
  }, [selectedAda, moduli.length, onSetModuli, dettagliAda]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"));
    
    if (sourceIndex === targetIndex) return;

    const newModuli = [...moduli];
    const [removed] = newModuli.splice(sourceIndex, 1);
    newModuli.splice(targetIndex, 0, removed);

    // Update ordine
    const reorderedModuli = newModuli.map((m, idx) => ({
      ...m,
      ordine: idx + 1,
    }));

    onSetModuli(reorderedModuli);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const totalDurata = moduli.reduce((sum, m) => sum + (m.durata || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Configura i Moduli Formativi</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Riordina i moduli trascinandoli e imposta la durata di ciascuno.
        </p>
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Moduli: <span className="font-medium text-foreground">{moduli.length}</span>
          </span>
          <span className="text-muted-foreground">
            Durata totale:{" "}
            <span className="font-medium text-foreground">{totalDurata} ore</span>
          </span>
        </div>
      </div>

      {/* Moduli list */}
      <div className="space-y-3">
        {moduli.map((modulo, index) => (
          <div
            className="rounded-lg border border-border bg-background transition-all hover:shadow-sm"
            draggable
            key={modulo.id}
            onDragOver={handleDragOver}
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="flex items-start gap-4 p-4">
              {/* Drag handle */}
              <div className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded bg-muted text-muted-foreground active:cursor-grabbing">
                <span className="text-lg font-medium">{modulo.ordine}</span>
              </div>

              {/* Modulo content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2">
                  {modulo.adaName}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{modulo.capacita.length} capacità</span>
                  <span>•</span>
                  <span>{modulo.conoscenze.length} conoscenze</span>
                </div>
              </div>

              {/* Duration input */}
              <div className="shrink-0">
                <label className="text-xs text-muted-foreground">
                  Durata (ore)
                </label>
                <input
                  className="mt-1 w-20 rounded border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  min={1}
                  onChange={(e) =>
                    onUpdateModulo(modulo.id, {
                      durata: parseInt(e.target.value) || 0,
                    })
                  }
                  type="number"
                  value={modulo.durata || ""}
                />
              </div>
            </div>

            {/* Competences summary (collapsible) */}
            <details className="border-t border-border/50">
              <summary className="cursor-pointer px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50">
                Mostra competenze incluse
              </summary>
              <div className="grid gap-4 bg-muted/30 px-4 py-3 sm:grid-cols-2">
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground">
                    Capacità ({modulo.capacita.length})
                  </h5>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {modulo.capacita.slice(0, 3).map((c, i) => (
                      <li className="truncate" key={i}>
                        • {c}
                      </li>
                    ))}
                    {modulo.capacita.length > 3 && (
                      <li className="text-muted-foreground">
                        ... e altre {modulo.capacita.length - 3}
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground">
                    Conoscenze ({modulo.conoscenze.length})
                  </h5>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {modulo.conoscenze.slice(0, 3).map((c, i) => (
                      <li className="truncate" key={i}>
                        • {c}
                      </li>
                    ))}
                    {modulo.conoscenze.length > 3 && (
                      <li className="text-muted-foreground">
                        ... e altre {modulo.conoscenze.length - 3}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>

      {moduli.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Seleziona almeno un&apos;ADA nel passo precedente per configurare i moduli
        </p>
      )}
    </div>
  );
}

