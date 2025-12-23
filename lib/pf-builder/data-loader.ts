import type { Ada, DettagliAda, FiguraProfessionale } from "./types";

// Import JSON data directly (bundled at build time)
import settoriData from "@/data/output/figureProfessionali Regione Toscana/settori.json";
import figurePerSettoreData from "@/data/output/figureProfessionali Regione Toscana/figure_per_settore.json";
import adaPerFiguraData from "@/data/output/figureProfessionali Regione Toscana/ada_per_figura.json";
import dettagliAdaData from "@/data/output/figureProfessionali Regione Toscana/dettagli_ada.json";

/**
 * PF Builder Data Loader
 *
 * Loads data from the Regione Toscana professional figures JSON files.
 * Data is imported statically and bundled at build time.
 */

// ============================================================================
// TYPES
// ============================================================================

export type Settori = string[];

export type FigurePerSettore = Record<string, FiguraProfessionale[]>;

export type AdaPerFigura = Record<string, Ada[]>;

export type DettagliAdaMap = Record<string, DettagliAda>;

// ============================================================================
// DATA LOADERS
// ============================================================================

/**
 * Load settori (sectors) list
 */
export async function loadSettori(): Promise<Settori> {
  return settoriData as Settori;
}

/**
 * Load figure professionali per settore
 */
export async function loadFigurePerSettore(): Promise<FigurePerSettore> {
  return figurePerSettoreData as FigurePerSettore;
}

/**
 * Load ADA per figura
 */
export async function loadAdaPerFigura(): Promise<AdaPerFigura> {
  return adaPerFiguraData as AdaPerFigura;
}

/**
 * Load dettagli ADA (capacità e conoscenze)
 */
export async function loadDettagliAda(): Promise<DettagliAdaMap> {
  return dettagliAdaData as DettagliAdaMap;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get figures for a specific settore
 */
export async function getFigureBySettore(
  settore: string
): Promise<FiguraProfessionale[]> {
  const data = await loadFigurePerSettore();
  return data[settore] ?? [];
}

/**
 * Get ADA for a specific figura
 */
export async function getAdaByFigura(figura: string): Promise<Ada[]> {
  const data = await loadAdaPerFigura();
  return data[figura] ?? [];
}

/**
 * Get dettagli (capacità + conoscenze) for a specific ADA
 */
export async function getDettagliByAda(
  adaName: string
): Promise<DettagliAda | null> {
  const data = await loadDettagliAda();
  return data[adaName] ?? null;
}

/**
 * Preload all data (useful for initial load)
 * Note: With static imports, data is already available
 */
export async function preloadAllData(): Promise<void> {
  // No-op with static imports - data is already bundled
}

/**
 * Clear all cached data (useful for testing)
 * Note: With static imports, this is a no-op
 */
export function clearDataCache(): void {
  // No-op with static imports
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

/**
 * Search settori by query
 */
export async function searchSettori(query: string): Promise<Settori> {
  const settori = await loadSettori();
  const lowerQuery = query.toLowerCase();
  return settori.filter((s) => s.toLowerCase().includes(lowerQuery));
}

/**
 * Search figure by query within a settore
 */
export async function searchFigure(
  settore: string,
  query: string
): Promise<FiguraProfessionale[]> {
  const figure = await getFigureBySettore(settore);
  const lowerQuery = query.toLowerCase();
  return figure.filter(
    (f) =>
      f.denominazione_figura.toLowerCase().includes(lowerQuery) ||
      f.descrizione.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search ADA by query within a figura
 */
export async function searchAda(figura: string, query: string): Promise<Ada[]> {
  const adaList = await getAdaByFigura(figura);
  const lowerQuery = query.toLowerCase();
  return adaList.filter(
    (a) =>
      a.denominazione_ada.toLowerCase().includes(lowerQuery) ||
      a.uc.toLowerCase().includes(lowerQuery)
  );
}
