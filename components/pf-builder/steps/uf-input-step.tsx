"use client";

import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UsePFBuilderReturn } from "@/hooks/use-pf-builder";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

type UfInputStepProps = {
  builder: UsePFBuilderReturn;
  onBack: () => void;
};

/**
 * UfInputStep - Step for adding and managing Unità Formative
 */
export function UfInputStep({ builder, onBack }: UfInputStepProps) {
  const t = useTranslations();
  const { state, addUf, removeUf, goToStep, canProceed, setTitle } = builder;
  const [newUfName, setNewUfName] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const handleAddUf = useCallback(() => {
    if (newUfName.trim()) {
      addUf(newUfName.trim());
      setNewUfName("");
    }
  }, [newUfName, addUf]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleAddUf();
      }
    },
    [handleAddUf]
  );

  return (
    <div className="flex h-full flex-col p-6">
      {/* Title Section */}
      <div className="mb-6">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="font-semibold text-xl"
              onBlur={() => setIsEditingTitle(false)}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingTitle(false);
                }
              }}
              placeholder={t(
                "pfBuilder.ufInput.titlePlaceholder",
                "Nome del Percorso Formativo"
              )}
              value={state.titolo}
            />
          </div>
        ) : (
          <button
            className="text-left transition-colors hover:text-primary"
            onClick={() => setIsEditingTitle(true)}
            type="button"
          >
            <h2 className="font-semibold text-xl">
              {state.titolo ||
                t(
                  "pfBuilder.ufInput.clickToAddTitle",
                  "Clicca per aggiungere un titolo"
                )}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t(
                "pfBuilder.ufInput.clickToEditTitle",
                "Clicca per modificare il titolo"
              )}
            </p>
          </button>
        )}
      </div>

      {/* Add UF Form */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium text-sm">
          {t("pfBuilder.ufInput.addTitle", "Aggiungi Unità Formativa")}
        </h3>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            data-testid="pf-uf-input"
            onChange={(e) => setNewUfName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "pfBuilder.ufInput.placeholder",
              "Nome dell'Unità Formativa"
            )}
            value={newUfName}
          />
          <Button
            data-testid="pf-uf-add-button"
            disabled={!newUfName.trim()}
            onClick={handleAddUf}
            size="icon"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {state.errors.ufName && (
          <p className="mt-1 text-destructive text-sm">{state.errors.ufName}</p>
        )}
      </div>

      {/* UF List */}
      <div
        className="flex-1 space-y-3 overflow-y-auto"
        data-testid="pf-uf-list"
      >
        {state.unitaFormative.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-border border-dashed">
            <p className="text-center text-muted-foreground">
              {t(
                "pfBuilder.ufInput.emptyState",
                "Nessuna Unità Formativa aggiunta."
              )}
              <br />
              <span className="text-sm">
                {t(
                  "pfBuilder.ufInput.emptyHint",
                  "Usa il form sopra o scrivi in chat per aggiungerne una."
                )}
              </span>
            </p>
          </div>
        ) : (
          state.unitaFormative.map((uf) => (
            <div
              className={cn(
                "rounded-lg border p-4 transition-all",
                uf.isComplete
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
              data-testid="pf-uf-item"
              key={uf.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium">{uf.nome}</h4>
                    {uf.isComplete ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground text-xs">
                    {uf.settore ? (
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {uf.settore}
                      </span>
                    ) : (
                      <span className="text-amber-500">
                        {t(
                          "pfBuilder.ufInput.sectorNotSelected",
                          "Settore non selezionato"
                        )}
                      </span>
                    )}
                    {uf.figura && (
                      <span className="max-w-[200px] truncate rounded-full bg-muted px-2 py-0.5">
                        {uf.figura}
                      </span>
                    )}
                    {uf.adaList.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5">
                        {uf.adaList.length} ADA
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeUf(uf.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
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
          disabled={!canProceed}
          onClick={() => goToStep("UF_SECTOR")}
          type="button"
        >
          {t("common.next", "Avanti")}
        </Button>
      </div>
    </div>
  );
}
