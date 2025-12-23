"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit,
  FileText,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n";
import type { PFBuilderState, UnitaFormativa } from "@/lib/pf-builder/types";
import { cn } from "@/lib/utils";

type SummaryStepProps = {
  state: PFBuilderState;
  onSetTitle: (titolo: string) => void;
  onEdit: () => void;
  onComplete: () => void;
  onCreateDocument: () => Promise<void>;
  isCreatingDocument?: boolean;
};

/**
 * SummaryStep - Final step showing a summary of the Percorso Formativo
 * with ability to generate a document artifact
 */
export function SummaryStep({
  state,
  onSetTitle,
  onEdit,
  onComplete,
  onCreateDocument,
  isCreatingDocument = false,
}: SummaryStepProps) {
  const t = useTranslations();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [expandedUfIds, setExpandedUfIds] = useState<Set<string>>(new Set());

  const toggleUfExpanded = (ufId: string) => {
    setExpandedUfIds((prev) => {
      const next = new Set(prev);
      if (next.has(ufId)) {
        next.delete(ufId);
      } else {
        next.add(ufId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedUfIds(new Set(state.unitaFormative.map((uf) => uf.id)));
  };

  const collapseAll = () => {
    setExpandedUfIds(new Set());
  };

  const allUfComplete = state.unitaFormative.every((uf) => uf.isComplete);
  const hasTitle = state.titolo.trim().length > 0;
  const canComplete = allUfComplete && hasTitle;

  // Stats
  const totalUf = state.unitaFormative.length;
  const totalAda = state.unitaFormative.reduce(
    (sum, uf) => sum + uf.adaList.length,
    0
  );
  const totalCapacita = state.unitaFormative.reduce(
    (sum, uf) =>
      sum + uf.adaList.reduce((s, ada) => s + ada.selectedCapacita.length, 0),
    0
  );
  const totalConoscenze = state.unitaFormative.reduce(
    (sum, uf) =>
      sum + uf.adaList.reduce((s, ada) => s + ada.selectedConoscenze.length, 0),
    0
  );

  return (
    <div className="flex h-full flex-col p-6" data-testid="pf-summary-step">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              {t("pfBuilder.summary.title", "Riepilogo")}
            </p>
            <p className="text-muted-foreground text-xs capitalize">
              {t("pfBuilder.summary.type", "Tipo")}: {state.tipo ?? "qualifica"}
            </p>
          </div>
        </div>

        {/* Editable Title */}
        {isEditingTitle ? (
          <div className="mt-4">
            <Input
              autoFocus
              className="h-auto py-2 font-bold text-2xl"
              onBlur={() => setIsEditingTitle(false)}
              onChange={(e) => onSetTitle(e.target.value)}
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
            className="group mt-4 text-left"
            onClick={() => setIsEditingTitle(true)}
            type="button"
          >
            <h1 className="flex items-center gap-2 font-bold text-2xl">
              {state.titolo ||
                t(
                  "pfBuilder.ufInput.clickToAddTitle",
                  "Clicca per aggiungere un titolo"
                )}
              <Edit className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </h1>
          </button>
        )}
        {!hasTitle && (
          <p className="mt-1 text-destructive text-sm">
            {t(
              "pfBuilder.summary.titleRequired",
              "Inserisci un titolo per il Percorso Formativo"
            )}
          </p>
        )}

        {/* Stats Summary */}
        <div className="mt-4 flex flex-wrap gap-3">
          <StatBadge
            label={t("pfBuilder.summary.ufCount", "Unità Formative")}
            value={totalUf}
          />
          <StatBadge label="ADA" value={totalAda} />
          <StatBadge
            label={t("pfBuilder.summary.capacitaCount", "Capacità")}
            value={totalCapacita}
          />
          <StatBadge
            label={t("pfBuilder.summary.conoscenzeCount", "Conoscenze")}
            value={totalConoscenze}
          />
        </div>
      </div>

      {/* UF List */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            {t("pfBuilder.summary.ufList", "Unità Formative")} ({totalUf})
          </h3>
          <div className="flex gap-2">
            <Button
              className="h-7 px-2 text-xs"
              onClick={expandAll}
              type="button"
              variant="ghost"
            >
              {t("pfBuilder.summary.expandAll", "Espandi tutto")}
            </Button>
            <Button
              className="h-7 px-2 text-xs"
              onClick={collapseAll}
              type="button"
              variant="ghost"
            >
              {t("pfBuilder.summary.collapseAll", "Comprimi tutto")}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {state.unitaFormative.map((uf, index) => (
            <UfSummaryCard
              index={index + 1}
              isExpanded={expandedUfIds.has(uf.id)}
              key={uf.id}
              onToggle={() => toggleUfExpanded(uf.id)}
              uf={uf}
            />
          ))}
        </div>

        {state.unitaFormative.length === 0 && (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            {t("pfBuilder.summary.noUf", "Nessuna Unità Formativa")}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-border border-t pt-4">
        <Button onClick={onEdit} type="button" variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          {t("pfBuilder.summary.edit", "Modifica")}
        </Button>

        <div className="flex gap-2">
          <Button
            data-testid="pf-create-document-button"
            disabled={!canComplete || isCreatingDocument}
            onClick={onCreateDocument}
            type="button"
            variant="secondary"
          >
            {isCreatingDocument ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {t("pfBuilder.summary.createDocument", "Crea Documento")}
          </Button>

          <Button
            data-testid="pf-complete-button"
            disabled={!canComplete}
            onClick={onComplete}
            type="button"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("pfBuilder.summary.complete", "Crea Percorso Formativo")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT BADGE
// ============================================================================

type StatBadgeProps = {
  label: string;
  value: number;
};

function StatBadge({ label, value }: StatBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
      <span className="font-semibold text-sm">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

// ============================================================================
// UF SUMMARY CARD
// ============================================================================

type UfSummaryCardProps = {
  uf: UnitaFormativa;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
};

function UfSummaryCard({
  uf,
  index,
  isExpanded,
  onToggle,
}: UfSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        uf.isComplete ? "border-green-500/30 bg-green-500/5" : "border-border"
      )}
    >
      <button className="w-full p-4 text-left" onClick={onToggle} type="button">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <h4 className="flex items-center gap-2 font-medium">
                <span className="text-muted-foreground">{index}.</span>
                {uf.nome}
                {uf.isComplete && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </h4>
              <p className="text-muted-foreground text-sm">
                {uf.settore && <span className="capitalize">{uf.settore}</span>}
                {uf.figura && (
                  <>
                    {" • "}
                    {uf.figura}
                  </>
                )}
              </p>
            </div>
          </div>
          <span className="text-muted-foreground text-xs">
            {uf.adaList.length} ADA
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-border/50 border-t px-4 pt-0 pb-4">
          {/* Settore Section */}
          {uf.settore && (
            <div className="mt-3">
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Settore
              </p>
              <p className="text-sm capitalize">{uf.settore}</p>
            </div>
          )}

          {/* Figura Section */}
          {uf.figura && (
            <div className="mt-3">
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Figura Professionale
              </p>
              <p className="font-medium text-sm">{uf.figura}</p>
              {uf.figuraDescrizione && (
                <p className="mt-1 text-muted-foreground text-sm italic">
                  {uf.figuraDescrizione}
                </p>
              )}
            </div>
          )}

          {/* ADA List */}
          <div className="mt-4 space-y-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Aree di Attività (ADA)
            </p>
            {uf.adaList.map((ada, adaIndex) => (
              <div className="rounded-md bg-muted/50 p-3" key={ada.adaId}>
                <h5 className="font-medium text-sm">
                  <span className="text-muted-foreground">
                    {adaIndex + 1}.{" "}
                  </span>
                  {ada.adaName}
                </h5>
                {ada.uc && (
                  <p className="text-muted-foreground text-xs">
                    Codice UC: {ada.uc}
                  </p>
                )}

                {ada.selectedCapacita.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 font-medium text-muted-foreground text-xs">
                      Capacità ({ada.selectedCapacita.length})
                    </p>
                    <ul className="space-y-0.5 text-xs">
                      {ada.selectedCapacita.map((cap) => (
                        <li key={cap}>• {cap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ada.selectedConoscenze.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 font-medium text-muted-foreground text-xs">
                      Conoscenze ({ada.selectedConoscenze.length})
                    </p>
                    <ul className="space-y-0.5 text-xs">
                      {ada.selectedConoscenze.map((con) => (
                        <li key={con}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
