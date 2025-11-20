import type { AttemptEvent } from "./types";

/**
 * Generic activity event factory
 *
 * Provides type-safe creation of lifecycle and custom events
 * for activity tracking in the chat canvas.
 */
export const ActivityEvent = {
  /**
   * Create lifecycle events for attempt tracking
   */
  lifecycle: (
    action:
      | "activity.start"
      | "activity.complete"
      | "activity.abandon"
      | "activity.pause"
      | "activity.resume",
    data?: Record<string, unknown>
  ): Omit<AttemptEvent, "id" | "createdAt"> => ({
    action,
    data: data || {},
  }),

  /**
   * Create custom domain events with typed data
   */
  custom: <T extends Record<string, unknown>>(
    action: string,
    data: T
  ): Omit<AttemptEvent, "id" | "createdAt"> => ({
    action,
    data: data || {},
  }),
};
