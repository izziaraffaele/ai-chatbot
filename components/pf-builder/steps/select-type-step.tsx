"use client";

import { Award, GraduationCap } from "lucide-react";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { PFType } from "@/lib/pf-builder/types";
import { cn } from "@/lib/utils";

type SelectTypeStepProps = {
  onSelect: (tipo: PFType) => void;
  selected: PFType | null;
};

/**
 * SelectTypeStep - Initial step for choosing between Qualifica and Certificazione
 */
export function SelectTypeStep({ onSelect, selected }: SelectTypeStepProps) {
  const t = useTranslations();

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-2 font-bold text-2xl">
          {t("pfBuilder.selectType.title", "Crea un nuovo Percorso Formativo")}
        </h1>
        <p className="mb-8 text-muted-foreground">
          {t(
            "pfBuilder.selectType.subtitle",
            "Seleziona il tipo di percorso che vuoi creare"
          )}
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Qualifica Card - Active */}
          <button
            className={cn(
              "group relative rounded-xl border-2 p-8 text-left transition-all duration-200",
              "hover:scale-[1.02] hover:border-primary hover:shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              selected === "qualifica"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card"
            )}
            data-testid="pf-select-type-qualifica"
            onClick={() => onSelect("qualifica")}
            type="button"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn(
                  "rounded-full p-4 transition-colors",
                  selected === "qualifica"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                <GraduationCap className="h-8 w-8" />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  {t("pfBuilder.qualifica.title", "Qualifica")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "pfBuilder.qualifica.description",
                    "Percorso formativo per ottenere una qualifica professionale riconosciuta dalla Regione Toscana"
                  )}
                </p>
              </div>
            </div>
            {selected === "qualifica" && (
              <div className="absolute top-3 right-3">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            )}
          </button>

          {/* Certificazione Card - Disabled */}
          <div
            className={cn(
              "relative rounded-xl border-2 border-border p-8 text-left",
              "cursor-not-allowed bg-muted/30 opacity-50"
            )}
            data-testid="pf-select-type-certificazione"
            title={t("pfBuilder.certificazione.comingSoon", "Prossimamente")}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-lg">
                  {t("pfBuilder.certificazione.title", "Certificazione")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "pfBuilder.certificazione.description",
                    "Percorso formativo per ottenere una certificazione di competenze specifiche"
                  )}
                </p>
              </div>
            </div>
            {/* Disabled badge */}
            <div className="absolute top-3 right-3">
              <span className="rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground text-xs">
                {t("pfBuilder.certificazione.comingSoon", "Prossimamente")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
