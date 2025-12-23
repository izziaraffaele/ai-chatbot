import { z } from "zod";

/**
 * Training Path Builder Types
 * Defines the data structures for building professional training paths
 * based on Regione Toscana professional figures catalog
 */

// ============================================================================
// Catalog Data Types (from JSON files)
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
// Builder State Types
// ============================================================================

export type BuilderStep =
  | "settore"
  | "figura"
  | "ada"
  | "moduli"
  | "riepilogo"
  | "completato";

export const TrainingModuleSchema = z.object({
  id: z.string(),
  adaId: z.string(),
  adaName: z.string(),
  capacita: z.array(z.string()),
  conoscenze: z.array(z.string()),
  durata: z.number().optional(),
  ordine: z.number(),
});

export type TrainingModule = z.infer<typeof TrainingModuleSchema>;

export const TrainingPathSchema = z.object({
  id: z.string(),
  titolo: z.string(),
  settore: z.string(),
  figura: z.string(),
  figuraDescrizione: z.string().optional(),
  moduli: z.array(TrainingModuleSchema),
  durataComplessiva: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TrainingPath = z.infer<typeof TrainingPathSchema>;

export const BuilderStateSchema = z.object({
  step: z.enum([
    "settore",
    "figura",
    "ada",
    "moduli",
    "riepilogo",
    "completato",
  ]),
  selectedSettore: z.string().nullable(),
  selectedFigura: z.string().nullable(),
  selectedFiguraDescrizione: z.string().nullable(),
  selectedAda: z.array(z.string()),
  moduli: z.array(TrainingModuleSchema),
  titolo: z.string(),
});

export type BuilderState = z.infer<typeof BuilderStateSchema>;

export const initialBuilderState: BuilderState = {
  step: "settore",
  selectedSettore: null,
  selectedFigura: null,
  selectedFiguraDescrizione: null,
  selectedAda: [],
  moduli: [],
  titolo: "",
};

// ============================================================================
// Builder Actions
// ============================================================================

export type BuilderAction =
  | { type: "SELECT_SETTORE"; payload: string }
  | { type: "SELECT_FIGURA"; payload: { nome: string; descrizione: string } }
  | { type: "TOGGLE_ADA"; payload: string }
  | { type: "SET_MODULI"; payload: TrainingModule[] }
  | { type: "UPDATE_MODULO"; payload: { id: string; updates: Partial<TrainingModule> } }
  | { type: "SET_TITOLO"; payload: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: BuilderStep }
  | { type: "RESET" };

// ============================================================================
// Tool Input/Output Types
// ============================================================================

export const CreateTrainingPathInputSchema = z.object({
  context: z.string().describe("Contesto della richiesta utente per creare il percorso formativo"),
  suggestedSettore: z.string().optional().describe("Settore suggerito in base al contesto"),
  suggestedFigura: z.string().optional().describe("Figura professionale suggerita"),
});

export type CreateTrainingPathInput = z.infer<typeof CreateTrainingPathInputSchema>;

export const CreateTrainingPathOutputSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
  trainingPath: TrainingPathSchema.optional(),
  cancelled: z.boolean().optional(),
});

export type CreateTrainingPathOutput = z.infer<typeof CreateTrainingPathOutputSchema>;

