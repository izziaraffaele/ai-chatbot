import { AttemptError } from "./errors";
import type { Attempt, AttemptEvent, AttemptStatus } from "./types";

/**
 * Valid attempt status transitions
 */
const VALID_STATUS_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["completed", "abandoned"],
  completed: [],
  abandoned: [],
};

/**
 * Validate attempt entity
 */
export function validateAttempt(attempt: Attempt): void {
  // Required fields
  if (!attempt.id || typeof attempt.id !== "string") {
    throw new AttemptError("Attempt must have a valid id");
  }

  if (!attempt.activityId || typeof attempt.activityId !== "string") {
    throw new AttemptError("Attempt must have a valid activityId");
  }

  if (!attempt.activityType || typeof attempt.activityType !== "string") {
    throw new AttemptError("Attempt must have a valid activityType");
  }

  if (!attempt.createdAt || !(attempt.createdAt instanceof Date)) {
    throw new AttemptError("Attempt must have a valid createdAt date");
  }

  // Status validation
  if (!isValidStatus(attempt.status)) {
    throw new AttemptError(`Invalid attempt status: ${attempt.status}`);
  }

  // Optional fields validation
  if (attempt.startedAt && !(attempt.startedAt instanceof Date)) {
    throw new AttemptError("Attempt startedAt must be a Date");
  }

  if (attempt.completedAt && !(attempt.completedAt instanceof Date)) {
    throw new AttemptError("Attempt completedAt must be a Date");
  }

  if (attempt.lastActivityAt && !(attempt.lastActivityAt instanceof Date)) {
    throw new AttemptError("Attempt lastActivityAt must be a Date");
  }

  // Metadata validation
  if (attempt.metadata && typeof attempt.metadata !== "object") {
    throw new AttemptError("Attempt metadata must be an object");
  }
}

/**
 * Validate attempt event
 */
export function validateAttemptEvent(event: AttemptEvent): void {
  // Required fields
  if (!event.id || typeof event.id !== "string") {
    throw new AttemptError("Event must have a valid id");
  }

  if (!event.action || typeof event.action !== "string") {
    throw new AttemptError("Event must have a valid action");
  }

  if (!event.createdAt || !(event.createdAt instanceof Date)) {
    throw new AttemptError("Event must have a valid createdAt date");
  }

  // Data validation
  if (event.data && typeof event.data !== "object") {
    throw new AttemptError("Event data must be an object");
  }
}

/**
 * Validate status transition
 */
export function validateStatusTransition(
  fromStatus: AttemptStatus,
  toStatus: AttemptStatus
): void {
  if (fromStatus === toStatus) {
    throw new AttemptError(
      `Cannot transition from ${fromStatus} to ${fromStatus}`
    );
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[fromStatus];
  if (!allowedTransitions.includes(toStatus)) {
    throw new AttemptError(
      `Invalid status transition from ${fromStatus} to ${toStatus}. Allowed: ${allowedTransitions.join(", ")}`
    );
  }
}

/**
 * Validate start arguments
 */
export function validateStartArgs(args?: unknown): void {
  if (!args) {
    return;
  }

  if (typeof args !== "object" || args === null) {
    throw new AttemptError("Start arguments must be an object");
  }

  const argsObj = args as Record<string, unknown>;

  // Validate metadata if present
  if (
    "metadata" in argsObj &&
    argsObj.metadata !== undefined &&
    (typeof argsObj.metadata !== "object" || argsObj.metadata === null)
  ) {
    throw new AttemptError("Start metadata must be an object");
  }
}

/**
 * Validate complete arguments
 */
export function validateCompleteArgs(args?: unknown): void {
  if (!args) {
    return;
  }

  if (typeof args !== "object" || args === null) {
    throw new AttemptError("Complete arguments must be an object");
  }

  const argsObj = args as Record<string, unknown>;

  // Validate score if present
  if ("score" in argsObj && argsObj.score !== undefined) {
    if (typeof argsObj.score !== "object" || argsObj.score === null) {
      throw new AttemptError("Score must be an object");
    }

    const scoreObj = argsObj.score as Record<string, unknown>;

    if (
      "raw" in scoreObj &&
      scoreObj.raw !== undefined &&
      typeof scoreObj.raw !== "number"
    ) {
      throw new AttemptError("Score raw must be a number");
    }

    if (
      "scaled" in scoreObj &&
      scoreObj.scaled !== undefined &&
      (typeof scoreObj.scaled !== "number" ||
        scoreObj.scaled < 0 ||
        scoreObj.scaled > 1)
    ) {
      throw new AttemptError("Score scaled must be a number between 0 and 1");
    }

    if (
      "max" in scoreObj &&
      scoreObj.max !== undefined &&
      (typeof scoreObj.max !== "number" || scoreObj.max < 0)
    ) {
      throw new AttemptError("Score max must be a positive number");
    }
  }

  // Validate metadata if present
  if (
    "metadata" in argsObj &&
    argsObj.metadata !== undefined &&
    (typeof argsObj.metadata !== "object" || argsObj.metadata === null)
  ) {
    throw new AttemptError("Complete metadata must be an object");
  }
}

/**
 * Validate event data
 */
export function validateEventData(eventData: Record<string, unknown>): void {
  if (!eventData || typeof eventData !== "object") {
    throw new AttemptError("Event data must be an object");
  }

  // Common validations for quiz events
  if ("questionId" in eventData && typeof eventData.questionId !== "string") {
    throw new AttemptError("Event questionId must be a string");
  }

  if ("isCorrect" in eventData && typeof eventData.isCorrect !== "boolean") {
    throw new AttemptError("Event isCorrect must be a boolean");
  }

  if (
    "timeSpent" in eventData &&
    (typeof eventData.timeSpent !== "number" || eventData.timeSpent < 0)
  ) {
    throw new AttemptError("Event timeSpent must be a positive number");
  }
}

/**
 * Helper function to check if status is valid
 */
function isValidStatus(status: string): status is AttemptStatus {
  return ["not_started", "in_progress", "completed", "abandoned"].includes(
    status
  );
}
