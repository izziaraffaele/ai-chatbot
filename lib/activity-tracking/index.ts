/**
 * Activity Tracking Module
 *
 * Core attempt tracking system for managing dynamic AI chat experiences
 * and interactive activities within the chat canvas.
 */

import { AttemptStore } from "./store";

// biome
export { AttemptError } from "./errors";
export { ActivityEvent } from "./events";
export { AttemptStore } from "./store";

export type {
  Attempt,
  AttemptEvent,
  AttemptScore,
  AttemptState,
  AttemptStatus,
  ReadableStore,
} from "./types";

/**
 * Factory function to create an AttemptStore with activity configuration
 */
export function createAttemptStore<START = unknown, COMPLETE = unknown>(
  activityId: string,
  activityType: string
): AttemptStore<START, COMPLETE> {
  return new AttemptStore<START, COMPLETE>(activityId, activityType);
}
