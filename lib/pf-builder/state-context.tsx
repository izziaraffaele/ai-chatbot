"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PFBuilderState } from "./types";

/**
 * PF Builder State Context
 *
 * Shares the current PF Builder state between the canvas and chat components.
 * This allows the chat agent to be aware of the current builder state when
 * responding to user questions like "cosa ho selezionato?".
 */

// ============================================================================
// SNAPSHOT TYPE (serializable subset for API transmission)
// ============================================================================

export type PFBuilderStateSnapshot = {
  isActive: boolean;
  step: PFBuilderState["step"];
  tipo: PFBuilderState["tipo"];
  titolo: string;
  unitaFormative: Array<{
    id: string;
    nome: string;
    descrizione?: string;
    settore: string | null;
    figura: string | null;
    figuraDescrizione?: string;
    adaCount: number;
    adaNames: string[];
    isComplete: boolean;
  }>;
};

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

type PFBuilderStateContextValue = {
  /** Current builder state (null if builder is not active) */
  state: PFBuilderState | null;
  /** Update the builder state */
  setState: (state: PFBuilderState | null) => void;
  /** Get a serializable snapshot for API transmission */
  getSnapshot: () => PFBuilderStateSnapshot;
};

const PFBuilderStateContext = createContext<PFBuilderStateContextValue | null>(
  null
);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

type PFBuilderStateProviderProps = {
  children: ReactNode;
};

export function PFBuilderStateProvider({
  children,
}: PFBuilderStateProviderProps) {
  const [state, setState] = useState<PFBuilderState | null>(null);

  const getSnapshot = useCallback((): PFBuilderStateSnapshot => {
    if (!state) {
      return {
        isActive: false,
        step: "SELECT_TYPE",
        tipo: null,
        titolo: "",
        unitaFormative: [],
      };
    }

    return {
      isActive: true,
      step: state.step,
      tipo: state.tipo,
      titolo: state.titolo,
      unitaFormative: state.unitaFormative.map((uf) => ({
        id: uf.id,
        nome: uf.nome,
        descrizione: uf.descrizione,
        settore: uf.settore,
        figura: uf.figura,
        figuraDescrizione: uf.figuraDescrizione,
        adaCount: uf.adaList.length,
        adaNames: uf.adaList.map((ada) => ada.adaName),
        isComplete: uf.isComplete,
      })),
    };
  }, [state]);

  const value = useMemo<PFBuilderStateContextValue>(
    () => ({
      state,
      setState,
      getSnapshot,
    }),
    [state, getSnapshot]
  );

  return (
    <PFBuilderStateContext.Provider value={value}>
      {children}
    </PFBuilderStateContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access the full PF Builder state context
 */
export function usePFBuilderStateContext(): PFBuilderStateContextValue {
  const context = useContext(PFBuilderStateContext);
  if (!context) {
    throw new Error(
      "usePFBuilderStateContext must be used within a PFBuilderStateProvider"
    );
  }
  return context;
}

/**
 * Access just the current builder state (or null if not active)
 */
export function usePFBuilderState(): PFBuilderState | null {
  const context = useContext(PFBuilderStateContext);
  return context?.state ?? null;
}

/**
 * Get the state snapshot for API transmission
 * Safe to use outside provider (returns inactive snapshot)
 */
export function usePFBuilderStateSnapshot(): PFBuilderStateSnapshot {
  const context = useContext(PFBuilderStateContext);
  
  if (!context) {
    return {
      isActive: false,
      step: "SELECT_TYPE",
      tipo: null,
      titolo: "",
      unitaFormative: [],
    };
  }
  
  return context.getSnapshot();
}

/**
 * Get the setState function to update builder state
 * Returns null if used outside provider
 */
export function usePFBuilderStateUpdater(): ((
  state: PFBuilderState | null
) => void) | null {
  const context = useContext(PFBuilderStateContext);
  return context?.setState ?? null;
}

