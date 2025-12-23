import { logPFBuilderEvent } from "./debug";
import type {
  PFBuilderEvent,
  PFBuilderEventType,
  PFBuilderState,
  UfBulkOperation,
  UfInput,
} from "./types";

/**
 * PF Builder Event Bus
 *
 * Singleton event bus for synchronizing state between the canvas UI and chat.
 * When the user interacts with the canvas, events are emitted here and can be
 * picked up by the chat system to notify the AI agent.
 */

// Debounce configuration
const DEBOUNCE_MS = 300;

export type PFBuilderEventListener = (event: PFBuilderEvent) => void;

class PFBuilderEventBus {
  private listeners = new Set<PFBuilderEventListener>();
  private lastEvent: PFBuilderEvent | null = null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingEvents = new Map<string, Omit<PFBuilderEvent, "timestamp">>();

  /**
   * Emit an event to all subscribers
   */
  emit(event: Omit<PFBuilderEvent, "timestamp">): void {
    const fullEvent: PFBuilderEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Log event in dev mode
    logPFBuilderEvent(fullEvent);

    this.lastEvent = fullEvent;
    this.listeners.forEach((listener) => listener(fullEvent));
  }

  /**
   * Emit an event with debouncing (for non-critical events)
   * Events of the same type are debounced - only the last one is emitted
   */
  emitDebounced(
    event: Omit<PFBuilderEvent, "timestamp">,
    debounceKey?: string
  ): void {
    const key = debounceKey ?? event.type;

    // Clear any existing timer for this key
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the pending event
    this.pendingEvents.set(key, event);

    // Set a new timer
    const timer = setTimeout(() => {
      const pendingEvent = this.pendingEvents.get(key);
      if (pendingEvent) {
        this.emit(pendingEvent);
        this.pendingEvents.delete(key);
      }
      this.debounceTimers.delete(key);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Subscribe to events
   * @returns Unsubscribe function
   */
  subscribe(listener: PFBuilderEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the last emitted event (useful for late subscribers)
   */
  getLastEvent(): PFBuilderEvent | null {
    return this.lastEvent;
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
    this.lastEvent = null;

    // Clear all pending debounce timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();
    this.pendingEvents.clear();
  }

  /**
   * Get the number of active listeners
   */
  get listenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Flush all pending debounced events immediately
   */
  flushPending(): void {
    this.debounceTimers.forEach((timer, key) => {
      clearTimeout(timer);
      const pendingEvent = this.pendingEvents.get(key);
      if (pendingEvent) {
        this.emit(pendingEvent);
      }
    });
    this.debounceTimers.clear();
    this.pendingEvents.clear();
  }
}

/**
 * Global singleton instance of the PF Builder event bus
 */
export const pfBuilderEventBus = new PFBuilderEventBus();

// ============================================================================
// HELPER FUNCTIONS FOR EMITTING EVENTS
// ============================================================================

// High-frequency events that should be debounced
const DEBOUNCED_EVENT_TYPES = new Set<PFBuilderEventType>([
  "CAPACITA_TOGGLED",
  "CONOSCENZA_TOGGLED",
  "TITLE_CHANGED",
]);

/**
 * Emit a canvas event (user interaction on canvas)
 * High-frequency events are automatically debounced
 */
export function emitCanvasEvent(
  type: PFBuilderEventType,
  payload: unknown
): void {
  const event = {
    type,
    payload,
    source: "canvas" as const,
  };

  // Use debounced emission for high-frequency events
  if (DEBOUNCED_EVENT_TYPES.has(type)) {
    pfBuilderEventBus.emitDebounced(event);
  } else {
    pfBuilderEventBus.emit(event);
  }
}

/**
 * Emit a canvas event with explicit debouncing
 */
export function emitDebouncedCanvasEvent(
  type: PFBuilderEventType,
  payload: unknown,
  debounceKey?: string
): void {
  pfBuilderEventBus.emitDebounced(
    {
      type,
      payload,
      source: "canvas",
    },
    debounceKey
  );
}

/**
 * Emit a chat event (AI/chat initiated action)
 */
export function emitChatEvent(
  type: PFBuilderEventType,
  payload: unknown
): void {
  pfBuilderEventBus.emit({
    type,
    payload,
    source: "chat",
  });
}

/**
 * Emit a chat event to update UF list (from chat tool)
 * This is used by the pfBuilderUpdateUF client tool
 */
export function emitChatUpdateUF(
  uf: UfInput[],
  operation: UfBulkOperation
): void {
  const eventType =
    operation === "replace" ? "UF_BULK_REPLACED" : "UF_BULK_ADDED";

  pfBuilderEventBus.emit({
    type: eventType,
    payload: { uf, operation },
    source: "chat",
  });
}

// ============================================================================
// EVENT MESSAGE FORMATTING
// ============================================================================

/**
 * Format an event into a human-readable message for the chat agent
 */
export function formatEventMessage(event: PFBuilderEvent): string {
  const { type, payload, source } = event;

  // Only format canvas events (chat doesn't need to notify itself)
  if (source !== "canvas") {
    return "";
  }

  const data = payload as Record<string, unknown>;

  switch (type) {
    case "TYPE_SELECTED":
      return `L'utente ha selezionato il tipo di percorso: "${data.tipo}".`;

    case "UF_ADDED":
      return `L'utente ha aggiunto l'Unità Formativa "${data.nome}" nel canvas.`;

    case "UF_REMOVED":
      return `L'utente ha rimosso un'Unità Formativa dal canvas.`;

    case "UF_SELECTED":
      return `L'utente ha selezionato l'Unità Formativa #${(data.ufIndex as number) + 1} per configurarla.`;

    case "SECTOR_SELECTED":
      return `L'utente ha selezionato il settore "${data.settore}" per l'UF corrente.`;

    case "FIGURE_SELECTED":
      return `L'utente ha selezionato la figura professionale "${data.figura}".`;

    case "ADA_TOGGLED":
      return data.selected
        ? `L'utente ha aggiunto l'ADA "${data.adaId}" alla selezione.`
        : `L'utente ha rimosso l'ADA "${data.adaId}" dalla selezione.`;

    case "CAPACITA_TOGGLED":
      return data.selected
        ? `L'utente ha selezionato una capacità.`
        : `L'utente ha deselezionato una capacità.`;

    case "CONOSCENZA_TOGGLED":
      return data.selected
        ? `L'utente ha selezionato una conoscenza.`
        : `L'utente ha deselezionato una conoscenza.`;

    case "STEP_CHANGED":
      return `L'utente è passato allo step "${data.step}".`;

    case "TITLE_CHANGED":
      return `L'utente ha modificato il titolo del percorso in "${data.titolo}".`;

    case "UF_COMPLETED":
      return `L'utente ha completato la configurazione dell'Unità Formativa "${data.nome}".`;

    case "PF_COMPLETED":
      return `L'utente ha completato la creazione del Percorso Formativo "${data.titolo}".`;

    case "BUILDER_RESET":
      return `L'utente ha resettato il builder.`;

    case "UF_BULK_ADDED": {
      const ufList = data.uf as UfInput[];
      const names = ufList.map((u) => u.nome).join(", ");
      return `Sono state aggiunte ${ufList.length} Unità Formative: ${names}.`;
    }

    case "UF_BULK_REPLACED": {
      const ufList = data.uf as UfInput[];
      const names = ufList.map((u) => u.nome).join(", ");
      return `La lista UF è stata sostituita con ${ufList.length} Unità Formative: ${names}.`;
    }

    default:
      return `Evento canvas: ${type}`;
  }
}

// ============================================================================
// STATE CHANGE DETECTOR
// ============================================================================

/**
 * Compare two states and emit appropriate events
 * Useful for detecting changes in a reducer and emitting events automatically
 */
export function detectAndEmitChanges(
  prevState: PFBuilderState,
  nextState: PFBuilderState,
  source: "canvas" | "chat" = "canvas"
): void {
  // Type changed
  if (prevState.tipo !== nextState.tipo && nextState.tipo) {
    pfBuilderEventBus.emit({
      type: "TYPE_SELECTED",
      payload: { tipo: nextState.tipo },
      source,
    });
  }

  // Step changed
  if (prevState.step !== nextState.step) {
    pfBuilderEventBus.emit({
      type: "STEP_CHANGED",
      payload: { step: nextState.step, prevStep: prevState.step },
      source,
    });
  }

  // Title changed
  if (prevState.titolo !== nextState.titolo && nextState.titolo) {
    pfBuilderEventBus.emit({
      type: "TITLE_CHANGED",
      payload: { titolo: nextState.titolo },
      source,
    });
  }

  // UF added
  if (nextState.unitaFormative.length > prevState.unitaFormative.length) {
    const newUf = nextState.unitaFormative.at(-1);
    if (newUf) {
      pfBuilderEventBus.emit({
        type: "UF_ADDED",
        payload: { nome: newUf.nome, id: newUf.id },
        source,
      });
    }
  }

  // UF removed
  if (nextState.unitaFormative.length < prevState.unitaFormative.length) {
    pfBuilderEventBus.emit({
      type: "UF_REMOVED",
      payload: {},
      source,
    });
  }

  // Sector changed for current UF
  if (nextState.currentUfIndex !== null) {
    const prevUf = prevState.unitaFormative[nextState.currentUfIndex];
    const nextUf = nextState.unitaFormative[nextState.currentUfIndex];

    if (
      prevUf &&
      nextUf &&
      prevUf.settore !== nextUf.settore &&
      nextUf.settore
    ) {
      pfBuilderEventBus.emit({
        type: "SECTOR_SELECTED",
        payload: { settore: nextUf.settore },
        source,
      });
    }

    if (prevUf && nextUf && prevUf.figura !== nextUf.figura && nextUf.figura) {
      pfBuilderEventBus.emit({
        type: "FIGURE_SELECTED",
        payload: { figura: nextUf.figura },
        source,
      });
    }
  }

  // UF completed
  if (nextState.currentUfIndex !== null) {
    const prevUf = prevState.unitaFormative[nextState.currentUfIndex];
    const nextUf = nextState.unitaFormative[nextState.currentUfIndex];

    if (prevUf && nextUf && !prevUf.isComplete && nextUf.isComplete) {
      pfBuilderEventBus.emit({
        type: "UF_COMPLETED",
        payload: { nome: nextUf.nome, id: nextUf.id },
        source,
      });
    }
  }
}
