"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  detectAndEmitChanges,
  emitCanvasEvent,
  type PFBuilderEventListener,
  pfBuilderEventBus,
} from "@/lib/pf-builder/event-bus";
import {
  canProceedFromStep,
  getStepIndex,
  getStepName,
  getTotalSteps,
  pfBuilderReducer,
} from "@/lib/pf-builder/reducer";
import {
  allUfsHaveAda,
  allUfsHaveFigure,
  allUfsHaveSector,
  canProceedToSummary,
  getCurrentAda,
  getCurrentUf,
  initialPFBuilderState,
  type PFBuilderAction,
  type PFBuilderState,
  type UfInput,
} from "@/lib/pf-builder/types";

/**
 * Hook for managing PF Builder state with event emission
 */
export function usePFBuilder(initialState?: Partial<PFBuilderState>) {
  const [state, rawDispatch] = useReducer(pfBuilderReducer, {
    ...initialPFBuilderState,
    ...initialState,
  });

  // Keep track of previous state for change detection
  const prevStateRef = useRef<PFBuilderState>(state);

  // Wrapped dispatch that emits events on state changes
  const dispatch = useCallback((action: PFBuilderAction) => {
    rawDispatch(action);
  }, []);

  // Detect and emit changes after state updates
  useEffect(() => {
    detectAndEmitChanges(prevStateRef.current, state, "canvas");
    prevStateRef.current = state;
  }, [state]);

  // Computed values
  const currentUf = getCurrentUf(state);
  const currentAda = getCurrentAda(state);
  const canProceed = canProceedFromStep(state);
  const canGoToSummary = canProceedToSummary(state);
  const canProceedFromSectors = allUfsHaveSector(state);
  const canProceedFromFigures = allUfsHaveFigure(state);
  const canProceedFromAda = allUfsHaveAda(state);
  const stepIndex = getStepIndex(state.step);
  const totalSteps = getTotalSteps();
  const stepName = getStepName(state.step);

  // Calculate progress
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  // Action helpers
  const selectType = useCallback(
    (tipo: "qualifica" | "certificazione") => {
      dispatch({ type: "SELECT_TYPE", payload: tipo });
      emitCanvasEvent("TYPE_SELECTED", { tipo });
    },
    [dispatch]
  );

  const addUf = useCallback(
    (nome: string, descrizione?: string) => {
      dispatch({ type: "ADD_UF", payload: { nome, descrizione } });
    },
    [dispatch]
  );

  const removeUf = useCallback(
    (ufId: string) => {
      dispatch({ type: "REMOVE_UF", payload: { ufId } });
    },
    [dispatch]
  );

  const selectUf = useCallback(
    (ufIndex: number) => {
      dispatch({ type: "SELECT_UF", payload: { ufIndex } });
      emitCanvasEvent("UF_SELECTED", { ufIndex });
    },
    [dispatch]
  );

  const selectSector = useCallback(
    (settore: string) => {
      dispatch({ type: "SELECT_SECTOR", payload: { settore } });
    },
    [dispatch]
  );

  // Batch sector selection - set sector for a specific UF by ID
  const setUfSector = useCallback(
    (ufId: string, settore: string) => {
      dispatch({ type: "SET_UF_SECTOR", payload: { ufId, settore } });
      emitCanvasEvent("SECTOR_SELECTED", { ufId, settore });
    },
    [dispatch]
  );

  const selectFigure = useCallback(
    (figura: string, descrizione: string) => {
      dispatch({ type: "SELECT_FIGURE", payload: { figura, descrizione } });
    },
    [dispatch]
  );

  // Batch figure selection - set figure for a specific UF by ID
  const setUfFigure = useCallback(
    (ufId: string, figura: string, descrizione: string) => {
      dispatch({ type: "SET_UF_FIGURE", payload: { ufId, figura, descrizione } });
      emitCanvasEvent("FIGURE_SELECTED", { ufId, figura, descrizione });
    },
    [dispatch]
  );

  // Batch ADA selection - toggle ADA for a specific UF by ID
  const toggleUfAda = useCallback(
    (ufId: string, adaId: string, adaName: string, uc: string) => {
      dispatch({
        type: "SET_UF_ADA_TOGGLE",
        payload: { ufId, adaId, adaName, uc },
      });
      // Check if the ADA is currently selected to emit the correct event
      const uf = state.unitaFormative.find((u) => u.id === ufId);
      const isSelected = uf?.adaList.some((a) => a.adaId === adaId) ?? false;
      emitCanvasEvent("ADA_TOGGLED", { ufId, adaId, selected: !isSelected });
    },
    [dispatch, state.unitaFormative]
  );

  const toggleAda = useCallback(
    (adaId: string, uc: string) => {
      dispatch({ type: "TOGGLE_ADA", payload: { adaId, uc } });
      const isSelected = state.tempSelectedAdaIds.includes(adaId);
      emitCanvasEvent("ADA_TOGGLED", { adaId, selected: !isSelected });
    },
    [dispatch, state.tempSelectedAdaIds]
  );

  const startAdaConfig = useCallback(() => {
    dispatch({ type: "START_ADA_CONFIG" });
  }, [dispatch]);

  const toggleCapacita = useCallback(
    (capacita: string, selected: boolean) => {
      dispatch({ type: "TOGGLE_CAPACITA", payload: { capacita, selected } });
      emitCanvasEvent("CAPACITA_TOGGLED", { capacita, selected });
    },
    [dispatch]
  );

  const toggleConoscenza = useCallback(
    (conoscenza: string, selected: boolean) => {
      dispatch({
        type: "TOGGLE_CONOSCENZA",
        payload: { conoscenza, selected },
      });
      emitCanvasEvent("CONOSCENZA_TOGGLED", { conoscenza, selected });
    },
    [dispatch]
  );

  const nextAda = useCallback(() => {
    dispatch({ type: "NEXT_ADA" });
  }, [dispatch]);

  const prevAda = useCallback(() => {
    dispatch({ type: "PREV_ADA" });
  }, [dispatch]);

  const completeUf = useCallback(() => {
    dispatch({ type: "COMPLETE_UF" });
  }, [dispatch]);

  const goToStep = useCallback(
    (step: PFBuilderState["step"]) => {
      dispatch({ type: "GO_TO_STEP", payload: step });
    },
    [dispatch]
  );

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, [dispatch]);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, [dispatch]);

  const setTitle = useCallback(
    (titolo: string) => {
      dispatch({ type: "SET_TITLE", payload: titolo });
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    emitCanvasEvent("BUILDER_RESET", {});
  }, [dispatch]);

  // Bulk UF operations (from chat)
  const bulkAddUf = useCallback(
    (uf: UfInput[]) => {
      dispatch({ type: "BULK_ADD_UF", payload: { uf } });
    },
    [dispatch]
  );

  const bulkReplaceUf = useCallback(
    (uf: UfInput[]) => {
      dispatch({ type: "BULK_REPLACE_UF", payload: { uf } });
    },
    [dispatch]
  );

  return {
    // State
    state,
    dispatch,

    // Computed
    currentUf,
    currentAda,
    canProceed,
    canGoToSummary,
    canProceedFromSectors,
    canProceedFromFigures,
    canProceedFromAda,
    stepIndex,
    totalSteps,
    stepName,
    progress,

    // Actions
    selectType,
    addUf,
    removeUf,
    selectUf,
    selectSector,
    setUfSector,
    selectFigure,
    setUfFigure,
    toggleUfAda,
    toggleAda,
    startAdaConfig,
    toggleCapacita,
    toggleConoscenza,
    nextAda,
    prevAda,
    completeUf,
    goToStep,
    nextStep,
    prevStep,
    setTitle,
    reset,

    // Bulk operations (from chat)
    bulkAddUf,
    bulkReplaceUf,
  };
}

/**
 * Hook to subscribe to PF Builder events
 */
export function usePFBuilderEvents(listener: PFBuilderEventListener) {
  useEffect(() => {
    return pfBuilderEventBus.subscribe(listener);
  }, [listener]);
}

export type UsePFBuilderReturn = ReturnType<typeof usePFBuilder>;
