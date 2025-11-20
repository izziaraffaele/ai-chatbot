import { AttemptError } from "./errors";
import type {
  Attempt,
  AttemptEvent,
  AttemptScore,
  AttemptState,
  ReadableStore,
} from "./types";
import {
  validateAttempt,
  validateAttemptEvent,
  validateCompleteArgs,
  validateEventData,
  validateStartArgs,
  validateStatusTransition,
} from "./validation";

/**
 * Simple store implementation for reactive state management
 */
class Store<T> implements ReadableStore<T> {
  private state: T;
  private animationFrameId: number | null = null;
  private readonly listeners: Set<() => void> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  setState(newState: T | ((currentState: T) => T)): void {
    const previousState = this.state;

    if (typeof newState === "function") {
      this.state = (newState as (currentState: T) => T)(this.state);
    } else {
      this.state = newState;
    }

    // Only notify if state actually changed
    if (this.state !== previousState) {
      this.notify();
    }
  }

  private notify(): void {
    if (this.animationFrameId) {
      return;
    }
    // Notify all listeners asynchronously to avoid batch updates
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      for (const listener of this.listeners) {
        try {
          listener();
        } catch (error) {
          console.error("Error in state listener:", error);
        }
      }
    });
  }
}

/**
 * AttemptStore - Manages activity attempt lifecycle with reactive state
 *
 * Provides a direct store interface without persistence adapter complexity,
 * suitable for in-memory activity tracking in the chat canvas.
 */
export class AttemptStore<START = unknown, COMPLETE = unknown>
  implements ReadableStore<AttemptState>
{
  private readonly store: Store<AttemptState>;
  private isPaused = false;
  private readonly activityId: string;
  private readonly activityType: string;

  constructor(activityId: string, activityType: string) {
    this.store = new Store<AttemptState>({
      currentAttempt: null,
      events: [],
    });

    this.activityId = activityId;
    this.activityType = activityType;
  }

  // ============================================
  // ReadableStore implementation (delegated)
  // ============================================

  getState = (): AttemptState => {
    return this.store.getState();
  };

  subscribe = (listener: () => void): (() => void) => {
    return this.store.subscribe(listener);
  };

  // ============================================
  // Lifecycle methods
  // ============================================

  /**
   * Start a new attempt for this activity
   */
  async start(args?: START): Promise<Attempt> {
    // Validation
    validateStartArgs(args);

    if (this.store.getState().currentAttempt) {
      throw new AttemptError(
        `Activity ${this.activityType}:${this.activityId} already started. Complete or abandon the current attempt before starting a new one.`
      );
    }

    // Create new attempt
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      activityId: this.activityId,
      activityType: this.activityType,
      status: "in_progress",
      passed: false,
      startedAt: new Date(),
      createdAt: new Date(),
      metadata: this.extractMetadata(args),
    };

    // Validate attempt
    validateAttempt(attempt);

    // Update state
    this.store.setState({
      currentAttempt: attempt,
      events: [],
    });

    this.isPaused = false;

    // Send start event
    await this.sendEvent({
      action: "activity.start",
      data: {},
    });

    return attempt;
  }

  /**
   * Complete the current attempt
   */
  async complete(args?: COMPLETE): Promise<Attempt> {
    // Validation
    validateCompleteArgs(args);
    this.ensureActiveAttempt();

    // biome-ignore lint: this is not null
    const currentAttempt = this.store.getState().currentAttempt!;

    // Validate status transition
    validateStatusTransition(currentAttempt.status, "completed");

    // Send completion event BEFORE persisting
    await this.sendEvent({
      action: "activity.complete",
      data: this.extractMetadata(args),
    });

    // Create completed attempt
    const completedAttempt: Attempt = {
      ...currentAttempt,
      status: "completed",
      completedAt: new Date(),
      lastActivityAt: new Date(),
      metadata: {
        ...currentAttempt.metadata,
        ...this.extractMetadata(args),
      },
      score: this.extractScore(args),
    };

    // Validate completed attempt
    validateAttempt(completedAttempt);

    // Update state
    this.store.setState({
      currentAttempt: completedAttempt,
      events: this.store.getState().events,
    });

    return completedAttempt;
  }

  /**
   * Abandon the current attempt
   */
  async abandon(args?: {
    metadata?: Record<string, unknown>;
  }): Promise<Attempt> {
    // Validation
    this.ensureActiveAttempt();

    // biome-ignore lint: this is not null
    const currentAttempt = this.store.getState().currentAttempt!;

    // Send abandon event BEFORE persisting
    await this.sendEvent({
      action: "activity.abandon",
      data: args?.metadata || {},
    });

    // Create abandoned attempt
    const abandonedAttempt: Attempt = {
      ...currentAttempt,
      status: "abandoned",
      completedAt: new Date(),
      lastActivityAt: new Date(),
      metadata: {
        ...currentAttempt.metadata,
        ...(args?.metadata || {}),
      },
    };

    // Update state
    this.store.setState({
      currentAttempt: abandonedAttempt,
      events: this.store.getState().events,
    });

    return abandonedAttempt;
  }

  /**
   * Send an event to the timeline
   */
  sendEvent(event: Omit<AttemptEvent, "id" | "createdAt">): Promise<void> {
    // Validation
    this.ensureActiveAttempt();

    // Validate event data
    validateEventData(event.data);

    const currentState = this.store.getState();

    // Skip if paused
    if (
      this.isPaused ||
      !currentState.currentAttempt ||
      currentState.currentAttempt.status !== "in_progress"
    ) {
      return Promise.resolve();
    }

    // Create event with auto-generated fields
    const finalEvent: AttemptEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    // Validate final event
    validateAttemptEvent(finalEvent);

    // Update state with new event
    this.store.setState((state) => ({
      ...state,
      events: [...state.events, finalEvent],
    }));

    return Promise.resolve();
  }

  /**
   * Reset the store state
   */
  reset(): void {
    // Prevent reset during active attempt to avoid data loss
    const currentAttempt = this.store.getState().currentAttempt;
    if (currentAttempt && currentAttempt.status === "in_progress") {
      throw new AttemptError(
        `Cannot reset while activity ${this.activityType}:${this.activityId} is in progress. Complete or abandon the attempt first.`
      );
    }

    this.store.setState({
      currentAttempt: null,
      events: [],
    });
    this.isPaused = false;
  }

  /**
   * Pause the current attempt
   */
  async pause(): Promise<void> {
    this.ensureActiveAttempt();

    await this.sendEvent({
      action: "activity.pause",
      data: {},
    });
    this.isPaused = true;
  }

  /**
   * Resume the current attempt
   */
  async play(): Promise<void> {
    this.ensureActiveAttempt();

    this.isPaused = false;
    await this.sendEvent({
      action: "activity.resume",
      data: {},
    });
  }

  // ============================================
  // Private helpers
  // ============================================

  private ensureActiveAttempt(): void {
    const state = this.store.getState();

    if (!state.currentAttempt) {
      throw new AttemptError(
        `Activity ${this.activityType}:${this.activityId} not started. Call start() first.`
      );
    }

    if (state.currentAttempt.status !== "in_progress") {
      throw new AttemptError(
        `Activity ${this.activityType}:${this.activityId} is ${state.currentAttempt.status}. Only in_progress activities can perform this action.`
      );
    }
  }

  private extractMetadata(args?: unknown): Record<string, unknown> {
    if (!args) {
      return {};
    }

    if (typeof args === "object" && args !== null) {
      const argsObj = args as Record<string, unknown>;
      if (
        "metadata" in argsObj &&
        typeof argsObj.metadata === "object" &&
        argsObj.metadata !== null
      ) {
        return argsObj.metadata as Record<string, unknown>;
      }
      return argsObj;
    }

    return {};
  }

  private extractScore(args?: unknown): AttemptScore | undefined {
    if (!args) {
      return;
    }

    if (typeof args === "object" && args !== null) {
      const argsObj = args as Record<string, unknown>;
      if (
        "score" in argsObj &&
        typeof argsObj.score === "object" &&
        argsObj.score !== null
      ) {
        return argsObj.score as AttemptScore;
      }
      if ("score" in argsObj && typeof argsObj.score === "number") {
        return { raw: argsObj.score };
      }
    }

    return;
  }
}
