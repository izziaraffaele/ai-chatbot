/**
 * Core attempt tracking types and interfaces
 *
 * Provides the foundational types for managing activity lifecycle,
 * event timeline, and reactive state management in the chat canvas.
 */

/**
 * Attempt status types representing the lifecycle state
 */
export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "abandoned";

/**
 * Score information for attempts that support scoring
 */
export type AttemptScore = {
  /** Raw score value */
  raw?: number;
  /** Scaled score (percentage 0-1) */
  scaled?: number;
  /** Maximum possible score */
  max?: number;
};

/**
 * Core attempt entity representing a single activity attempt
 */
export type Attempt = {
  /** Unique identifier for the attempt */
  id: string;
  /** Identifier of the activity being attempted */
  activityId: string;
  /** Type/category of the activity */
  activityType: string;
  /** Current status of the attempt */
  status: AttemptStatus;
  /** Whether the attempt was successful/passed */
  passed: boolean;
  /** When the attempt was started */
  startedAt?: Date;
  /** When the attempt was completed or abandoned */
  completedAt?: Date;
  /** When the attempt was created */
  createdAt: Date;
  /** When the attempt was last active */
  lastActivityAt?: Date;
  /** Additional metadata for the attempt */
  metadata: Record<string, unknown>;
  /** Score information if the activity supports scoring */
  score?: AttemptScore;
};

/**
 * Event data for attempt timeline tracking
 */
export type AttemptEvent = {
  /** Unique identifier for the event */
  id: string;
  /** Action identifier (e.g., 'quiz.answer', 'activity.start') */
  action: string;
  /** When the event was created */
  createdAt: Date;
  /** Event-specific data */
  data: Record<string, unknown>;
};

/**
 * Store state container for reactive management
 */
export type AttemptState = {
  /** Current active attempt, if any */
  currentAttempt: Attempt | null;
  /** Timeline of events for the current attempt */
  events: AttemptEvent[];
};

/**
 * Readable store interface for reactive state access
 */
export type ReadableStore<T> = {
  /** Get current state */
  getState(): T;
  /** Subscribe to state changes, returns unsubscribe function */
  subscribe(listener: () => void): () => void;
};
