/**
 * PF Builder Debug Utilities
 *
 * Development-only logging for PF Builder events and state changes.
 * All logging is disabled in production.
 */

import type { PFBuilderEvent, PFBuilderState } from "./types";

const isDev = process.env.NODE_ENV === "development";

// Logging prefix for easy filtering in console
const PREFIX = "[PF-Builder]";

/**
 * Log a PF Builder event (dev only)
 */
export function logPFBuilderEvent(event: PFBuilderEvent): void {
  if (!isDev) return;

  const { type, source, payload, timestamp } = event;
  const time = new Date(timestamp).toISOString().slice(11, 23);

  console.log(
    `%c${PREFIX} Event: ${type}`,
    source === "canvas" ? "color: #3b82f6" : "color: #10b981",
    { source, payload, time }
  );
}

/**
 * Log state change with diff (dev only)
 */
export function logPFBuilderStateChange(
  prevState: PFBuilderState,
  nextState: PFBuilderState
): void {
  if (!isDev) return;

  const changes: Record<string, { from: unknown; to: unknown }> = {};

  // Check step change
  if (prevState.step !== nextState.step) {
    changes.step = { from: prevState.step, to: nextState.step };
  }

  // Check tipo change
  if (prevState.tipo !== nextState.tipo) {
    changes.tipo = { from: prevState.tipo, to: nextState.tipo };
  }

  // Check titolo change
  if (prevState.titolo !== nextState.titolo) {
    changes.titolo = { from: prevState.titolo, to: nextState.titolo };
  }

  // Check UF count change
  if (prevState.unitaFormative.length !== nextState.unitaFormative.length) {
    changes.ufCount = {
      from: prevState.unitaFormative.length,
      to: nextState.unitaFormative.length,
    };
  }

  // Only log if there are changes
  if (Object.keys(changes).length > 0) {
    console.log(`%c${PREFIX} State Changed`, "color: #f59e0b", changes);
  }
}

/**
 * Log when builder state is synced to chat context (dev only)
 */
export function logPFBuilderSync(snapshot: {
  isActive: boolean;
  step: string;
  ufCount: number;
}): void {
  if (!isDev) return;

  console.log(`%c${PREFIX} Synced to chat context`, "color: #8b5cf6", snapshot);
}

/**
 * Log when builder state is sent with chat message (dev only)
 */
export function logPFBuilderChatRequest(snapshot: {
  isActive: boolean;
  step: string;
  ufCount: number;
}): void {
  if (!isDev) return;

  console.log(
    `%c${PREFIX} Included in chat request`,
    "color: #ec4899",
    snapshot
  );
}

/**
 * Log generic debug message (dev only)
 */
export function logPFBuilderDebug(message: string, data?: unknown): void {
  if (!isDev) return;

  if (data !== undefined) {
    console.log(`%c${PREFIX} ${message}`, "color: #6b7280", data);
  } else {
    console.log(`%c${PREFIX} ${message}`, "color: #6b7280");
  }
}

