"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Import the JSON data directly
import settoriData from "@/data/output/figureProfessionali Regione Toscana/settori.json";

type SettoreStepProps = {
  selected: string | null;
  onSelect: (settore: string) => void;
};

export function SettoreStep({ selected, onSelect }: SettoreStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const settori = settoriData as string[];

  const filteredSettori = settori.filter((settore) =>
    settore.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Seleziona il Settore</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Scegli il settore professionale per il tuo percorso formativo
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca settore..."
          type="text"
          value={searchTerm}
        />
      </div>

      {/* Settori grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSettori.map((settore) => (
          <button
            className={cn(
              "rounded-lg border p-4 text-left transition-all",
              selected === settore
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            key={settore}
            onClick={() => onSelect(settore)}
            type="button"
          >
            <span className="text-sm font-medium capitalize">{settore}</span>
          </button>
        ))}
      </div>

      {filteredSettori.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nessun settore trovato per &quot;{searchTerm}&quot;
        </p>
      )}
    </div>
  );
}

