import type {
  PFBuilderAction,
  PFBuilderState,
  PFBuilderStep,
  SelectedAdaDetails,
} from "./types";
import {
  allUfsHaveAda,
  allUfsHaveFigure,
  allUfsHaveSector,
  createSelectedAdaDetails,
  createUnitaFormativa,
  initialPFBuilderState,
  isUfComplete,
  PF_VALIDATION,
} from "./types";

// ============================================================================
// STEP ORDER
// ============================================================================

const STEP_ORDER: PFBuilderStep[] = [
  "SELECT_TYPE",
  "UF_INPUT",
  "UF_SECTOR",
  "UF_FIGURE",
  "UF_ADA",
  "ADA_DETAILS",
  "SUMMARY",
];

// ============================================================================
// REDUCER
// ============================================================================

/**
 * PF Builder State Reducer
 * Manages the state machine for the Percorso Formativo builder
 */
export function pfBuilderReducer(
  state: PFBuilderState,
  action: PFBuilderAction
): PFBuilderState {
  switch (action.type) {
    // ========================================================================
    // TYPE SELECTION
    // ========================================================================
    case "SELECT_TYPE":
      return {
        ...state,
        tipo: action.payload,
        step: "UF_INPUT",
        errors: {},
      };

    // ========================================================================
    // UF MANAGEMENT
    // ========================================================================
    case "ADD_UF": {
      const { nome, descrizione } = action.payload;
      if (!nome.trim()) {
        return {
          ...state,
          errors: {
            ...state.errors,
            ufName: "Inserisci un nome per l'Unità Formativa",
          },
        };
      }

      const newUf = createUnitaFormativa(nome.trim(), descrizione);
      return {
        ...state,
        unitaFormative: [...state.unitaFormative, newUf],
        errors: {},
      };
    }

    case "REMOVE_UF": {
      const { ufId } = action.payload;
      return {
        ...state,
        unitaFormative: state.unitaFormative.filter((uf) => uf.id !== ufId),
        // Reset current indices if we removed the current UF
        currentUfIndex:
          state.currentUfIndex !== null &&
          state.unitaFormative[state.currentUfIndex]?.id === ufId
            ? null
            : state.currentUfIndex,
        currentAdaIndex:
          state.currentUfIndex !== null &&
          state.unitaFormative[state.currentUfIndex]?.id === ufId
            ? null
            : state.currentAdaIndex,
      };
    }

    case "SELECT_UF": {
      const { ufIndex } = action.payload;
      if (ufIndex < 0 || ufIndex >= state.unitaFormative.length) {
        return state;
      }

      const uf = state.unitaFormative[ufIndex];
      // Determine which step to go to based on UF's current state
      let nextStep: PFBuilderStep = "UF_SECTOR";
      if (uf.settore && !uf.figura) {
        nextStep = "UF_FIGURE";
      } else if (uf.settore && uf.figura && uf.adaList.length === 0) {
        nextStep = "UF_ADA";
      } else if (uf.settore && uf.figura && uf.adaList.length > 0) {
        // Check if all ADA are fully configured
        const allAdaConfigured = uf.adaList.every(
          (ada) =>
            ada.selectedCapacita.length >= PF_VALIDATION.MIN_CAPACITA &&
            ada.selectedConoscenze.length >= PF_VALIDATION.MIN_CONOSCENZE
        );
        nextStep = allAdaConfigured ? "UF_SECTOR" : "ADA_DETAILS";
      }

      return {
        ...state,
        currentUfIndex: ufIndex,
        currentAdaIndex: null,
        tempSelectedAdaIds: uf.adaList.map((ada) => ada.adaId),
        step: nextStep,
        errors: {},
      };
    }

    case "UPDATE_UF_NAME": {
      const { ufId, nome } = action.payload;
      if (!nome.trim()) {
        return {
          ...state,
          errors: {
            ...state.errors,
            ufName: "Il nome non può essere vuoto",
          },
        };
      }

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf) =>
          uf.id === ufId ? { ...uf, nome: nome.trim() } : uf
        ),
        errors: {},
      };
    }

    // ========================================================================
    // BULK UF OPERATIONS (from chat)
    // ========================================================================
    case "BULK_ADD_UF": {
      const { uf: newUfList } = action.payload;

      // Validate and clean input
      const validUf = newUfList
        .map((u) => ({ ...u, nome: u.nome.trim() }))
        .filter((u) => u.nome.length > 0);

      if (validUf.length === 0) {
        return {
          ...state,
          errors: {
            ...state.errors,
            bulkUf: "Nessuna UF valida da aggiungere",
          },
        };
      }

      // Get existing UF names (case-insensitive)
      const existingNames = new Set(
        state.unitaFormative.map((uf) => uf.nome.toLowerCase())
      );

      // Filter out duplicates (case-insensitive)
      const uniqueNewUf = validUf.filter(
        (u) => !existingNames.has(u.nome.toLowerCase())
      );

      // Create new UF entities
      const newUfEntities = uniqueNewUf.map((u) =>
        createUnitaFormativa(u.nome, u.descrizione)
      );

      return {
        ...state,
        unitaFormative: [...state.unitaFormative, ...newUfEntities],
        errors: {},
      };
    }

    case "BULK_REPLACE_UF": {
      const { uf: newUfList } = action.payload;

      // Validate and clean input
      const validUf = newUfList
        .map((u) => ({ ...u, nome: u.nome.trim() }))
        .filter((u) => u.nome.length > 0);

      if (validUf.length === 0) {
        return {
          ...state,
          errors: {
            ...state.errors,
            bulkUf: "Nessuna UF valida da inserire",
          },
        };
      }

      // Remove duplicates within the new list (case-insensitive, keep first)
      const seenNames = new Set<string>();
      const uniqueUf = validUf.filter((u) => {
        const lowerName = u.nome.toLowerCase();
        if (seenNames.has(lowerName)) {
          return false;
        }
        seenNames.add(lowerName);
        return true;
      });

      // Create new UF entities
      const newUfEntities = uniqueUf.map((u) =>
        createUnitaFormativa(u.nome, u.descrizione)
      );

      return {
        ...state,
        unitaFormative: newUfEntities,
        currentUfIndex: null,
        currentAdaIndex: null,
        tempSelectedAdaIds: [],
        errors: {},
      };
    }

    // ========================================================================
    // SECTOR SELECTION (legacy single-UF mode)
    // ========================================================================
    case "SELECT_SECTOR": {
      if (state.currentUfIndex === null) return state;

      const { settore } = action.payload;
      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf, idx) =>
          idx === state.currentUfIndex
            ? {
                ...uf,
                settore,
                // Reset downstream selections when sector changes
                figura: null,
                figuraDescrizione: undefined,
                adaList: [],
                isComplete: false,
              }
            : uf
        ),
        tempSelectedAdaIds: [],
        step: "UF_FIGURE",
        errors: {},
      };
    }

    // ========================================================================
    // BATCH SECTOR SELECTION (set sector for specific UF by ID)
    // ========================================================================
    case "SET_UF_SECTOR": {
      const { ufId, settore } = action.payload;
      const ufIndex = state.unitaFormative.findIndex((uf) => uf.id === ufId);
      if (ufIndex === -1) return state;

      const currentUf = state.unitaFormative[ufIndex];
      // Only reset downstream data if sector actually changed
      const sectorChanged = currentUf.settore !== settore;

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf) =>
          uf.id === ufId
            ? {
                ...uf,
                settore,
                // Reset downstream selections only if sector changed
                ...(sectorChanged
                  ? {
                      figura: null,
                      figuraDescrizione: undefined,
                      adaList: [],
                      isComplete: false,
                    }
                  : {}),
              }
            : uf
        ),
        errors: {},
      };
    }

    // ========================================================================
    // FIGURE SELECTION (legacy single-UF mode)
    // ========================================================================
    case "SELECT_FIGURE": {
      if (state.currentUfIndex === null) return state;

      const { figura, descrizione } = action.payload;
      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf, idx) =>
          idx === state.currentUfIndex
            ? {
                ...uf,
                figura,
                figuraDescrizione: descrizione,
                // Reset ADA when figure changes
                adaList: [],
                isComplete: false,
              }
            : uf
        ),
        tempSelectedAdaIds: [],
        step: "UF_ADA",
        errors: {},
      };
    }

    // ========================================================================
    // BATCH FIGURE SELECTION (set figure for specific UF by ID)
    // ========================================================================
    case "SET_UF_FIGURE": {
      const { ufId, figura, descrizione } = action.payload;
      const ufIndex = state.unitaFormative.findIndex((uf) => uf.id === ufId);
      if (ufIndex === -1) return state;

      const currentUf = state.unitaFormative[ufIndex];
      // Only reset downstream data if figure actually changed
      const figureChanged = currentUf.figura !== figura;

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf) =>
          uf.id === ufId
            ? {
                ...uf,
                figura,
                figuraDescrizione: descrizione,
                // Reset ADA only if figure changed
                ...(figureChanged
                  ? {
                      adaList: [],
                      isComplete: false,
                    }
                  : {}),
              }
            : uf
        ),
        errors: {},
      };
    }

    // ========================================================================
    // BATCH ADA SELECTION (toggle ADA for specific UF by ID)
    // ========================================================================
    case "SET_UF_ADA_TOGGLE": {
      const { ufId, adaId, adaName, uc } = action.payload;
      const ufIndex = state.unitaFormative.findIndex((uf) => uf.id === ufId);
      if (ufIndex === -1) return state;

      const currentUf = state.unitaFormative[ufIndex];
      const isSelected = currentUf.adaList.some((a) => a.adaId === adaId);

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf) =>
          uf.id === ufId
            ? {
                ...uf,
                adaList: isSelected
                  ? uf.adaList.filter((a) => a.adaId !== adaId)
                  : [
                      ...uf.adaList,
                      createSelectedAdaDetails(adaId, adaName, uc),
                    ],
                isComplete: false,
              }
            : uf
        ),
        errors: {},
      };
    }

    // ========================================================================
    // ADA TOGGLE (before configuring) - legacy single-UF mode
    // ========================================================================
    case "TOGGLE_ADA": {
      const { adaId } = action.payload;
      const isSelected = state.tempSelectedAdaIds.includes(adaId);

      return {
        ...state,
        tempSelectedAdaIds: isSelected
          ? state.tempSelectedAdaIds.filter((id) => id !== adaId)
          : [...state.tempSelectedAdaIds, adaId],
        errors: {},
      };
    }

    // ========================================================================
    // START ADA CONFIGURATION
    // ========================================================================
    case "START_ADA_CONFIG": {
      if (state.currentUfIndex === null) return state;
      if (state.tempSelectedAdaIds.length === 0) {
        return {
          ...state,
          errors: {
            ...state.errors,
            ada: "Seleziona almeno un'Area di Attività",
          },
        };
      }

      // Create SelectedAdaDetails for each selected ADA
      const currentUf = state.unitaFormative[state.currentUfIndex];
      if (!currentUf) return state;

      // Keep existing ADA details if they exist, add new ones
      const existingAdaIds = new Set(currentUf.adaList.map((a) => a.adaId));
      const newAdaDetails: SelectedAdaDetails[] = state.tempSelectedAdaIds
        .filter((adaId) => !existingAdaIds.has(adaId))
        .map((adaId) => createSelectedAdaDetails(adaId, adaId, ""));

      const updatedAdaList = [
        ...currentUf.adaList.filter((a) =>
          state.tempSelectedAdaIds.includes(a.adaId)
        ),
        ...newAdaDetails,
      ];

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf, idx) =>
          idx === state.currentUfIndex ? { ...uf, adaList: updatedAdaList } : uf
        ),
        currentAdaIndex: 0,
        step: "ADA_DETAILS",
        errors: {},
      };
    }

    // ========================================================================
    // CAPACITÀ/CONOSCENZE TOGGLE
    // ========================================================================
    case "TOGGLE_CAPACITA": {
      if (state.currentUfIndex === null || state.currentAdaIndex === null) {
        return state;
      }

      const { capacita, selected } = action.payload;

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf, ufIdx) =>
          ufIdx === state.currentUfIndex
            ? {
                ...uf,
                adaList: uf.adaList.map((ada, adaIdx) =>
                  adaIdx === state.currentAdaIndex
                    ? {
                        ...ada,
                        selectedCapacita: selected
                          ? [...ada.selectedCapacita, capacita]
                          : ada.selectedCapacita.filter((c) => c !== capacita),
                      }
                    : ada
                ),
              }
            : uf
        ),
        errors: {},
      };
    }

    case "TOGGLE_CONOSCENZA": {
      if (state.currentUfIndex === null || state.currentAdaIndex === null) {
        return state;
      }

      const { conoscenza, selected } = action.payload;

      return {
        ...state,
        unitaFormative: state.unitaFormative.map((uf, ufIdx) =>
          ufIdx === state.currentUfIndex
            ? {
                ...uf,
                adaList: uf.adaList.map((ada, adaIdx) =>
                  adaIdx === state.currentAdaIndex
                    ? {
                        ...ada,
                        selectedConoscenze: selected
                          ? [...ada.selectedConoscenze, conoscenza]
                          : ada.selectedConoscenze.filter(
                              (c) => c !== conoscenza
                            ),
                      }
                    : ada
                ),
              }
            : uf
        ),
        errors: {},
      };
    }

    // ========================================================================
    // ADA NAVIGATION
    // ========================================================================
    case "NEXT_ADA": {
      if (state.currentUfIndex === null || state.currentAdaIndex === null) {
        return state;
      }

      const uf = state.unitaFormative[state.currentUfIndex];
      if (!uf) return state;

      const currentAda = uf.adaList[state.currentAdaIndex];
      if (!currentAda) return state;

      // Validate current ADA before moving to next
      if (currentAda.selectedCapacita.length < PF_VALIDATION.MIN_CAPACITA) {
        return {
          ...state,
          errors: {
            ...state.errors,
            capacita: `Seleziona almeno ${PF_VALIDATION.MIN_CAPACITA} capacità`,
          },
        };
      }
      if (currentAda.selectedConoscenze.length < PF_VALIDATION.MIN_CONOSCENZE) {
        return {
          ...state,
          errors: {
            ...state.errors,
            conoscenze: `Seleziona almeno ${PF_VALIDATION.MIN_CONOSCENZE} conoscenze`,
          },
        };
      }

      const nextIndex = state.currentAdaIndex + 1;
      if (nextIndex >= uf.adaList.length) {
        // All ADAs configured, complete UF
        return pfBuilderReducer(state, { type: "COMPLETE_UF" });
      }

      return {
        ...state,
        currentAdaIndex: nextIndex,
        errors: {},
      };
    }

    case "PREV_ADA": {
      if (state.currentUfIndex === null || state.currentAdaIndex === null) {
        return state;
      }

      if (state.currentAdaIndex === 0) {
        // Go back to ADA selection
        return {
          ...state,
          currentAdaIndex: null,
          step: "UF_ADA",
          errors: {},
        };
      }

      return {
        ...state,
        currentAdaIndex: state.currentAdaIndex - 1,
        errors: {},
      };
    }

    // ========================================================================
    // COMPLETE UF
    // ========================================================================
    case "COMPLETE_UF": {
      if (state.currentUfIndex === null) return state;

      const uf = state.unitaFormative[state.currentUfIndex];
      if (!uf) return state;

      // Validate all ADAs
      const allAdaValid = uf.adaList.every(
        (ada) =>
          ada.selectedCapacita.length >= PF_VALIDATION.MIN_CAPACITA &&
          ada.selectedConoscenze.length >= PF_VALIDATION.MIN_CONOSCENZE
      );

      if (!allAdaValid) {
        return {
          ...state,
          errors: {
            ...state.errors,
            ada: "Completa la configurazione di tutte le ADA",
          },
        };
      }

      // Mark current UF as complete
      const updatedUfs = state.unitaFormative.map((u, idx) =>
        idx === state.currentUfIndex ? { ...u, isComplete: isUfComplete(u) } : u
      );

      // Find the next UF that needs ADA configuration (has ADAs but not complete)
      const nextUfIndex = updatedUfs.findIndex(
        (u, idx) =>
          idx > state.currentUfIndex! &&
          u.adaList.length > 0 &&
          !isUfComplete(u)
      );

      if (nextUfIndex !== -1) {
        // Move to next UF's ADA configuration
        return {
          ...state,
          unitaFormative: updatedUfs,
          currentUfIndex: nextUfIndex,
          currentAdaIndex: 0,
          tempSelectedAdaIds: [],
          step: "ADA_DETAILS",
          errors: {},
        };
      }

      // All UFs are complete, go to SUMMARY
      return {
        ...state,
        unitaFormative: updatedUfs,
        currentUfIndex: null,
        currentAdaIndex: null,
        tempSelectedAdaIds: [],
        step: "SUMMARY",
        errors: {},
      };
    }

    // ========================================================================
    // NAVIGATION
    // ========================================================================
    case "GO_TO_STEP":
      return {
        ...state,
        step: action.payload,
        errors: {},
      };

    case "NEXT_STEP": {
      // Special case: transitioning from UF_ADA to ADA_DETAILS
      // Set up the first UF and first ADA for configuration
      if (state.step === "UF_ADA") {
        // Find the first UF that has ADAs to configure
        const firstUfWithAda = state.unitaFormative.findIndex(
          (uf) => uf.adaList.length > 0
        );
        if (firstUfWithAda === -1) {
          return {
            ...state,
            errors: {
              ...state.errors,
              ada: "Seleziona almeno un'ADA per ogni UF",
            },
          };
        }

        return {
          ...state,
          currentUfIndex: firstUfWithAda,
          currentAdaIndex: 0,
          step: "ADA_DETAILS",
          errors: {},
        };
      }

      const currentIndex = STEP_ORDER.indexOf(state.step);
      if (currentIndex < STEP_ORDER.length - 1) {
        return {
          ...state,
          step: STEP_ORDER[currentIndex + 1],
          errors: {},
        };
      }
      return state;
    }

    case "PREV_STEP": {
      // Handle special cases for UF configuration steps
      if (state.step === "UF_SECTOR") {
        return {
          ...state,
          currentUfIndex: null,
          currentAdaIndex: null,
          tempSelectedAdaIds: [],
          step: "UF_INPUT",
          errors: {},
        };
      }

      if (state.step === "UF_FIGURE") {
        return {
          ...state,
          step: "UF_SECTOR",
          errors: {},
        };
      }

      if (state.step === "UF_ADA") {
        return {
          ...state,
          step: "UF_FIGURE",
          errors: {},
        };
      }

      if (state.step === "ADA_DETAILS") {
        if (state.currentAdaIndex !== null && state.currentAdaIndex > 0) {
          return {
            ...state,
            currentAdaIndex: state.currentAdaIndex - 1,
            errors: {},
          };
        }
        return {
          ...state,
          currentAdaIndex: null,
          step: "UF_ADA",
          errors: {},
        };
      }

      if (state.step === "SUMMARY") {
        return {
          ...state,
          step: "UF_INPUT",
          errors: {},
        };
      }

      const currentIndex = STEP_ORDER.indexOf(state.step);
      if (currentIndex > 0) {
        return {
          ...state,
          step: STEP_ORDER[currentIndex - 1],
          errors: {},
        };
      }
      return state;
    }

    // ========================================================================
    // TITLE
    // ========================================================================
    case "SET_TITLE":
      return {
        ...state,
        titolo: action.payload,
      };

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    case "SET_ERROR":
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.message,
        },
      };

    case "CLEAR_ERROR": {
      const { [action.payload.key]: _, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors,
      };
    }

    case "CLEAR_ALL_ERRORS":
      return {
        ...state,
        errors: {},
      };

    // ========================================================================
    // LOADING STATE
    // ========================================================================
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    // ========================================================================
    // RESET
    // ========================================================================
    case "RESET":
      return initialPFBuilderState;

    default:
      return state;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get step index for progress indicator
 */
export function getStepIndex(step: PFBuilderStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Get total number of main steps (excluding sub-steps)
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length;
}

/**
 * Check if can proceed from current step
 */
export function canProceedFromStep(state: PFBuilderState): boolean {
  switch (state.step) {
    case "SELECT_TYPE":
      return state.tipo !== null;

    case "UF_INPUT":
      // Just need at least one UF to proceed to sector selection
      return state.unitaFormative.length > 0;

    case "UF_SECTOR":
      // Batch mode: all UFs must have a sector assigned
      return allUfsHaveSector(state);

    case "UF_FIGURE":
      // Batch mode: all UFs must have a figure assigned
      return allUfsHaveFigure(state);

    case "UF_ADA":
      // Batch mode: all UFs must have at least one ADA assigned
      return allUfsHaveAda(state);

    case "ADA_DETAILS": {
      if (state.currentUfIndex === null || state.currentAdaIndex === null) {
        return false;
      }
      const uf = state.unitaFormative[state.currentUfIndex];
      const ada = uf?.adaList[state.currentAdaIndex];
      if (!ada) return false;
      return (
        ada.selectedCapacita.length >= PF_VALIDATION.MIN_CAPACITA &&
        ada.selectedConoscenze.length >= PF_VALIDATION.MIN_CONOSCENZE
      );
    }

    case "SUMMARY":
      return (
        state.titolo.trim().length > 0 &&
        state.unitaFormative.length > 0 &&
        state.unitaFormative.every((uf) => uf.isComplete)
      );

    default:
      return false;
  }
}

/**
 * Get human-readable step name
 */
export function getStepName(step: PFBuilderStep): string {
  const names: Record<PFBuilderStep, string> = {
    SELECT_TYPE: "Tipo Percorso",
    UF_INPUT: "Unità Formative",
    UF_SECTOR: "Settore",
    UF_FIGURE: "Figura Professionale",
    UF_ADA: "Aree di Attività",
    ADA_DETAILS: "Capacità e Conoscenze",
    SUMMARY: "Riepilogo",
  };
  return names[step];
}
