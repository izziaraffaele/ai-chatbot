import type { BuilderAction, BuilderState, BuilderStep } from "./types";
import { initialBuilderState } from "./types";

const STEP_ORDER: BuilderStep[] = [
  "settore",
  "figura",
  "ada",
  "moduli",
  "riepilogo",
  "completato",
];

/**
 * Builder State Reducer
 * Manages the state machine for the training path builder
 */
export function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "SELECT_SETTORE":
      return {
        ...state,
        selectedSettore: action.payload,
        // Reset downstream selections when settore changes
        selectedFigura: null,
        selectedFiguraDescrizione: null,
        selectedAda: [],
        moduli: [],
      };

    case "SELECT_FIGURA":
      return {
        ...state,
        selectedFigura: action.payload.nome,
        selectedFiguraDescrizione: action.payload.descrizione,
        // Reset downstream selections when figura changes
        selectedAda: [],
        moduli: [],
      };

    case "TOGGLE_ADA": {
      const adaId = action.payload;
      const isSelected = state.selectedAda.includes(adaId);
      
      return {
        ...state,
        selectedAda: isSelected
          ? state.selectedAda.filter((id) => id !== adaId)
          : [...state.selectedAda, adaId],
      };
    }

    case "SET_MODULI":
      return {
        ...state,
        moduli: action.payload,
      };

    case "UPDATE_MODULO": {
      const { id, updates } = action.payload;
      return {
        ...state,
        moduli: state.moduli.map((modulo) =>
          modulo.id === id ? { ...modulo, ...updates } : modulo
        ),
      };
    }

    case "SET_TITOLO":
      return {
        ...state,
        titolo: action.payload,
      };

    case "NEXT_STEP": {
      const currentIndex = STEP_ORDER.indexOf(state.step);
      if (currentIndex < STEP_ORDER.length - 1) {
        return {
          ...state,
          step: STEP_ORDER[currentIndex + 1],
        };
      }
      return state;
    }

    case "PREV_STEP": {
      const currentIndex = STEP_ORDER.indexOf(state.step);
      if (currentIndex > 0) {
        return {
          ...state,
          step: STEP_ORDER[currentIndex - 1],
        };
      }
      return state;
    }

    case "GO_TO_STEP":
      return {
        ...state,
        step: action.payload,
      };

    case "RESET":
      return initialBuilderState;

    default:
      return state;
  }
}

/**
 * Check if the current step is valid based on state
 */
export function canProceedToNextStep(state: BuilderState): boolean {
  switch (state.step) {
    case "settore":
      return state.selectedSettore !== null;
    case "figura":
      return state.selectedFigura !== null;
    case "ada":
      return state.selectedAda.length > 0;
    case "moduli":
      return state.moduli.length > 0;
    case "riepilogo":
      return state.titolo.trim().length > 0;
    case "completato":
      return false;
    default:
      return false;
  }
}

/**
 * Get step index for progress indicator
 */
export function getStepIndex(step: BuilderStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Get total number of steps (excluding completato)
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length - 1; // Exclude "completato"
}

