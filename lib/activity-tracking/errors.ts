/**
 * Error types for attempt-related operations
 */
export class AttemptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttemptError";
  }
}
