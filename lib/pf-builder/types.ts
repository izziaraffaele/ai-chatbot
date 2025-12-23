import { z } from "zod";

/**
 * PF Builder Types
 * Defines the data structures for building Percorsi Formativi (Training Paths)
 * based on Regione Toscana professional figures catalog
 */

// ============================================================================
// TIPI PRINCIPALI
// ============================================================================

export type PFType = "qualifica" | "certificazione";

export type PFBuilderStep =
  | "SELECT_TYPE" // Scelta qualifica/certificazione
  | "UF_INPUT" // Inserimento/gestione UF
  | "UF_SECTOR" // Scelta settore per UF corrente
  | "UF_FIGURE" // Scelta figura per UF corrente
  | "UF_ADA" // Scelta ADA per UF corrente
  | "ADA_DETAILS" // Scelta capacità/conoscenze per ADA
  | "SUMMARY"; // Riepilogo finale

// ============================================================================
// CATALOG DATA TYPES (from JSON files)
// ============================================================================

export const FiguraProfessionaleSchema = z.object({
  denominazione_figura: z.string(),
  descrizione: z.string(),
});

export type FiguraProfessionale = z.infer<typeof FiguraProfessionaleSchema>;

export const AdaSchema = z.object({
  denominazione_ada: z.string(),
  uc: z.string(),
});

export type Ada = z.infer<typeof AdaSchema>;

export const DettagliAdaSchema = z.object({
  capacita: z.array(z.string()),
  conoscenze: z.array(z.string()),
});

export type DettagliAda = z.infer<typeof DettagliAdaSchema>;

// ============================================================================
// SELECTED ADA DETAILS
// ============================================================================

export const SelectedAdaDetailsSchema = z.object({
  adaId: z.string(), // denominazione_ada
  adaName: z.string(), // Nome ADA
  uc: z.string(), // Codice UC
  selectedCapacita: z.array(z.string()), // Min 2 richiesti
  selectedConoscenze: z.array(z.string()), // Min 2 richiesti
});

export type SelectedAdaDetails = z.infer<typeof SelectedAdaDetailsSchema>;

// ============================================================================
// UNITÀ FORMATIVA
// ============================================================================

export const UnitaFormativaSchema = z.object({
  id: z.string(), // UUID
  nome: z.string(), // Nome UF inserito dall'utente
  descrizione: z.string().optional(), // Descrizione opzionale

  // Dati selezionati
  settore: z.string().nullable(), // Settore scelto
  figura: z.string().nullable(), // denominazione_figura
  figuraDescrizione: z.string().optional(), // Descrizione figura
  adaList: z.array(SelectedAdaDetailsSchema), // ADA con relativi dettagli

  // Stato validazione
  isComplete: z.boolean(), // true se tutti i dati richiesti sono compilati
});

export type UnitaFormativa = z.infer<typeof UnitaFormativaSchema>;

// ============================================================================
// PERCORSO FORMATIVO
// ============================================================================

export const PercorsoFormativoSchema = z.object({
  id: z.string(),
  tipo: z.enum(["qualifica", "certificazione"]),
  titolo: z.string(),
  unitaFormative: z.array(UnitaFormativaSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PercorsoFormativo = z.infer<typeof PercorsoFormativoSchema>;

// ============================================================================
// BUILDER STATE
// ============================================================================

export const PFBuilderStateSchema = z.object({
  // Step corrente
  step: z.enum([
    "SELECT_TYPE",
    "UF_INPUT",
    "UF_SECTOR",
    "UF_FIGURE",
    "UF_ADA",
    "ADA_DETAILS",
    "SUMMARY",
  ]),

  // Dati PF
  tipo: z.enum(["qualifica", "certificazione"]).nullable(),
  titolo: z.string(),

  // Lista UF
  unitaFormative: z.array(UnitaFormativaSchema),

  // Indici correnti per editing
  currentUfIndex: z.number().nullable(), // Quale UF si sta modificando
  currentAdaIndex: z.number().nullable(), // Quale ADA si sta configurando

  // Temporary selection state (before confirming ADA details)
  tempSelectedAdaIds: z.array(z.string()), // ADA IDs selected but not yet configured

  // UI state
  errors: z.record(z.string(), z.string()), // Errori di validazione
  isLoading: z.boolean(),
});

export type PFBuilderState = z.infer<typeof PFBuilderStateSchema>;

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialPFBuilderState: PFBuilderState = {
  step: "SELECT_TYPE",
  tipo: null,
  titolo: "",
  unitaFormative: [],
  currentUfIndex: null,
  currentAdaIndex: null,
  tempSelectedAdaIds: [],
  errors: {},
  isLoading: false,
};

// ============================================================================
// BUILDER ACTIONS
// ============================================================================

export type PFBuilderAction =
  // Type selection
  | { type: "SELECT_TYPE"; payload: PFType }

  // UF management
  | { type: "ADD_UF"; payload: { nome: string; descrizione?: string } }
  | { type: "REMOVE_UF"; payload: { ufId: string } }
  | { type: "SELECT_UF"; payload: { ufIndex: number } }
  | { type: "UPDATE_UF_NAME"; payload: { ufId: string; nome: string } }

  // Bulk UF operations (from chat)
  | {
      type: "BULK_ADD_UF";
      payload: { uf: Array<{ nome: string; descrizione?: string }> };
    }
  | {
      type: "BULK_REPLACE_UF";
      payload: { uf: Array<{ nome: string; descrizione?: string }> };
    }

  // Sector selection (single UF - legacy)
  | { type: "SELECT_SECTOR"; payload: { settore: string } }

  // Batch sector selection (set sector for specific UF by ID)
  | { type: "SET_UF_SECTOR"; payload: { ufId: string; settore: string } }

  // Figure selection (single UF - legacy)
  | {
      type: "SELECT_FIGURE";
      payload: { figura: string; descrizione: string };
    }

  // Batch figure selection (set figure for specific UF by ID)
  | {
      type: "SET_UF_FIGURE";
      payload: { ufId: string; figura: string; descrizione: string };
    }

  // Batch ADA selection (toggle ADA for specific UF by ID)
  | {
      type: "SET_UF_ADA_TOGGLE";
      payload: { ufId: string; adaId: string; adaName: string; uc: string };
    }

  // ADA selection (toggle before configuring)
  | { type: "TOGGLE_ADA"; payload: { adaId: string; uc: string } }

  // Start configuring selected ADAs
  | { type: "START_ADA_CONFIG" }

  // ADA details (capacità/conoscenze)
  | {
      type: "TOGGLE_CAPACITA";
      payload: { capacita: string; selected: boolean };
    }
  | {
      type: "TOGGLE_CONOSCENZA";
      payload: { conoscenza: string; selected: boolean };
    }
  | { type: "NEXT_ADA" }
  | { type: "PREV_ADA" }
  | { type: "COMPLETE_UF" }

  // Navigation
  | { type: "GO_TO_STEP"; payload: PFBuilderStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }

  // Title
  | { type: "SET_TITLE"; payload: string }

  // Error handling
  | { type: "SET_ERROR"; payload: { key: string; message: string } }
  | { type: "CLEAR_ERROR"; payload: { key: string } }
  | { type: "CLEAR_ALL_ERRORS" }

  // Loading state
  | { type: "SET_LOADING"; payload: boolean }

  // Reset
  | { type: "RESET" };

// ============================================================================
// EVENT TYPES (for chat-canvas sync)
// ============================================================================

export type PFBuilderEventType =
  | "TYPE_SELECTED"
  | "UF_ADDED"
  | "UF_REMOVED"
  | "UF_SELECTED"
  | "UF_BULK_ADDED" // Multiple UF added from chat
  | "UF_BULK_REPLACED" // UF list replaced from chat
  | "SECTOR_SELECTED"
  | "FIGURE_SELECTED"
  | "ADA_TOGGLED"
  | "CAPACITA_TOGGLED"
  | "CONOSCENZA_TOGGLED"
  | "STEP_CHANGED"
  | "TITLE_CHANGED"
  | "UF_COMPLETED"
  | "PF_COMPLETED"
  | "BUILDER_RESET";

export type PFBuilderEvent = {
  type: PFBuilderEventType;
  payload: unknown;
  source: "canvas" | "chat";
  timestamp: number;
};

// ============================================================================
// UF INPUT SCHEMA (for chat-to-canvas sync)
// ============================================================================

export const UfInputSchema = z.object({
  nome: z.string().min(1, "Il nome UF è obbligatorio"),
  descrizione: z.string().optional(),
});

export type UfInput = z.infer<typeof UfInputSchema>;

export const UfBulkOperationSchema = z.enum(["merge", "replace"]);

export type UfBulkOperation = z.infer<typeof UfBulkOperationSchema>;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const PF_VALIDATION = {
  MIN_CAPACITA: 2,
  MIN_CONOSCENZE: 2,
  MIN_UF: 1,
  MIN_ADA_PER_UF: 1,
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const PF_ERROR_CODES = {
  EMPTY_UF_NAME: "EMPTY_UF_NAME",
  DUPLICATE_UF: "DUPLICATE_UF",
  NO_UF: "NO_UF",
  UF_INCOMPLETE: "UF_INCOMPLETE",
  MIN_CAPACITA: "MIN_CAPACITA",
  MIN_CONOSCENZE: "MIN_CONOSCENZE",
  NO_ADA: "NO_ADA",
  NO_SECTOR: "NO_SECTOR",
  NO_FIGURE: "NO_FIGURE",
  DATA_LOAD_ERROR: "DATA_LOAD_ERROR",
  // Edge case error codes
  NO_FIGURES_FOR_SECTOR: "NO_FIGURES_FOR_SECTOR",
  NO_ADA_FOR_FIGURE: "NO_ADA_FOR_FIGURE",
  ADA_DETAILS_NOT_FOUND: "ADA_DETAILS_NOT_FOUND",
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new empty Unità Formativa
 */
export function createUnitaFormativa(
  nome: string,
  descrizione?: string
): UnitaFormativa {
  return {
    id: crypto.randomUUID(),
    nome,
    descrizione,
    settore: null,
    figura: null,
    figuraDescrizione: undefined,
    adaList: [],
    isComplete: false,
  };
}

/**
 * Create a new empty SelectedAdaDetails
 */
export function createSelectedAdaDetails(
  adaId: string,
  adaName: string,
  uc: string
): SelectedAdaDetails {
  return {
    adaId,
    adaName,
    uc,
    selectedCapacita: [],
    selectedConoscenze: [],
  };
}

/**
 * Check if a UF is complete (has all required data)
 */
export function isUfComplete(uf: UnitaFormativa): boolean {
  if (!uf.settore || !uf.figura) {
    return false;
  }

  if (uf.adaList.length < PF_VALIDATION.MIN_ADA_PER_UF) {
    return false;
  }

  // Check each ADA has minimum capacità and conoscenze
  return uf.adaList.every(
    (ada) =>
      ada.selectedCapacita.length >= PF_VALIDATION.MIN_CAPACITA &&
      ada.selectedConoscenze.length >= PF_VALIDATION.MIN_CONOSCENZE
  );
}

/**
 * Check if the PF can proceed to summary
 */
export function canProceedToSummary(state: PFBuilderState): boolean {
  if (state.unitaFormative.length < PF_VALIDATION.MIN_UF) {
    return false;
  }

  // At least one UF must be complete
  return state.unitaFormative.some((uf) => isUfComplete(uf));
}

/**
 * Check if the current ADA has minimum selections
 */
export function isCurrentAdaValid(state: PFBuilderState): boolean {
  if (state.currentUfIndex === null || state.currentAdaIndex === null) {
    return false;
  }

  const uf = state.unitaFormative[state.currentUfIndex];
  if (!uf) return false;

  const ada = uf.adaList[state.currentAdaIndex];
  if (!ada) return false;

  return (
    ada.selectedCapacita.length >= PF_VALIDATION.MIN_CAPACITA &&
    ada.selectedConoscenze.length >= PF_VALIDATION.MIN_CONOSCENZE
  );
}

/**
 * Get the current UF being edited
 */
export function getCurrentUf(state: PFBuilderState): UnitaFormativa | null {
  if (state.currentUfIndex === null) return null;
  return state.unitaFormative[state.currentUfIndex] ?? null;
}

/**
 * Get the current ADA being configured
 */
export function getCurrentAda(
  state: PFBuilderState
): SelectedAdaDetails | null {
  const uf = getCurrentUf(state);
  if (!uf || state.currentAdaIndex === null) return null;
  return uf.adaList[state.currentAdaIndex] ?? null;
}

/**
 * Check if all UFs have a sector assigned (for batch UF_SECTOR step)
 */
export function allUfsHaveSector(state: PFBuilderState): boolean {
  if (state.unitaFormative.length === 0) return false;
  return state.unitaFormative.every((uf) => uf.settore !== null);
}

/**
 * Check if all UFs have a figure assigned (for batch UF_FIGURE step)
 */
export function allUfsHaveFigure(state: PFBuilderState): boolean {
  if (state.unitaFormative.length === 0) return false;
  return state.unitaFormative.every((uf) => uf.figura !== null);
}

/**
 * Check if all UFs have at least one ADA assigned (for batch UF_ADA step)
 */
export function allUfsHaveAda(state: PFBuilderState): boolean {
  if (state.unitaFormative.length === 0) return false;
  return state.unitaFormative.every(
    (uf) => uf.adaList.length >= PF_VALIDATION.MIN_ADA_PER_UF
  );
}
