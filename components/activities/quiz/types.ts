/**
 * Quiz-specific types for demonstrating activity tracking
 *
 * These types show how domain-specific activities can extend
 * the core activity tracking system with their own data structures.
 */

export type QuizAnswerEventData = {
  /** ID of the question being answered */
  questionId: string;
  /** The user's answer */
  answer: unknown;
  /** Whether the answer is correct */
  isCorrect: boolean;
  /** Time spent on this question (optional) */
  timeSpent?: number;
} & Record<string, unknown>;

export type QuizTimeUpEventData = {
  /** ID of the question that timed out */
  questionId: string;
} & Record<string, unknown>;

export type QuizRequestHintEventData = {
  /** ID of the question for which hint was requested */
  questionId: string;
} & Record<string, unknown>;

/**
 * Quiz event factory for type-safe event creation
 */
export const QuizEvent = {
  /**
   * Create answer submission event
   */
  answer: (data: QuizAnswerEventData) => ({
    action: "quiz.answer" as const,
    data,
  }),

  /**
   * Create time-up event for unanswered questions
   */
  timeUp: (data: QuizTimeUpEventData) => ({
    action: "quiz.time_up" as const,
    data,
  }),

  /**
   * Create hint request event
   */
  requestHint: (data: QuizRequestHintEventData) => ({
    action: "quiz.request_hint" as const,
    data,
  }),
};
