import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AttemptState, AttemptStore } from "@/lib/activity-tracking";
import { usePlayer } from "../../player";

// ============================================================================
// Types
// ============================================================================

/**
 * Quiz question definition
 */
export type QuizQuestion<T = unknown> = {
  /** Unique identifier for the question */
  id: string;
  /** The question text or content */
  question: string;
  /** The correct answer */
  correctAnswer: T;
  /** Available options (for multiple choice) */
  choices?: Array<{
    value: T;
    label: string;
  }>;
  /** Optional explanation for the answer */
  explanation?: string;
  /** Optional time limit in seconds */
  timeLimit?: number;
};

/**
 * Quiz event data types
 */
export type QuizAnswerEventData = {
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  timeSpent?: number;
} & Record<string, unknown>;

export type QuizTimeUpEventData = {
  questionId: string;
  timeSpent?: number;
} & Record<string, unknown>;

export type QuizRequestHintEventData = {
  questionId: string;
  hint?: string;
} & Record<string, unknown>;

/**
 * Quiz start arguments
 */
export type QuizStartArgs = {
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Quiz complete arguments
 */
export type QuizCompleteArgs = {
  score: {
    raw?: number;
    max?: number;
    scaled: number;
  };
  totalQuestions: number;
  metadata?: Record<string, unknown>;
};

/**
 * Quiz player configuration
 */
export type QuizPlayerConfig<T = unknown> = {
  /** Quiz questions */
  questions: QuizQuestion<T>[];
  /** Optional validation function for custom answer checking */
  validate?: (answer: unknown, correctAnswer: unknown) => Promise<boolean>;
  /** Whether to require confirmation before submitting answers */
  requireConfirm?: boolean;
  /** Default screen to show */
  defaultScreen?: "welcome" | "quiz";
  /** Attempts history */
  attempts?: any[];
};

/**
 * Quiz player hook return type
 */
export type UseQuizPlayerReturn<T = unknown> = {
  /** Current state from Player */
  state: AttemptState;
  /** Store instance from Player */
  store: AttemptStore<QuizStartArgs, QuizCompleteArgs>;
  /** Current question */
  currentQuestion: QuizQuestion<T> | null;
  /** Current question index */
  currentIndex: number;
  /** Selected answer */
  selectedAnswer: T | null;
  /** Whether answer has been validated */
  isAnswerValidated: boolean;
  /** Whether current answer is correct */
  isCorrect: boolean;
  /** Current score */
  score: number;
  /** Quiz statistics */
  stats: {
    totalAttempts: number;
    avgScore: number;
  };
  /** Event handlers */
  handlers: {
    selectAnswer: (answer: unknown) => void;
    confirmAnswer: () => Promise<void>;
    next: () => Promise<void>;
    cancel: () => Promise<void>;
    start: () => Promise<void>;
    restart: () => Promise<void>;
    timeUp: () => Promise<void>;
  };
  /** UI state */
  isTimerActive: boolean;
  /** Current screen */
  screen: "welcome" | "quiz" | "end";
  /** Quiz configuration */
  config: QuizPlayerConfig<T>;
};

/**
 * Quiz context type
 */
export type QuizContextValue<T = any> = {
  quiz: UseQuizPlayerReturn<T>;
};

// ============================================================================
// Events
// ============================================================================

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

// ============================================================================
// Context
// ============================================================================

const QuizContext = createContext<QuizContextValue | null>(null);

/**
 * Quiz Provider component
 */
export function QuizProvider({
  children,
  config,
}: React.PropsWithChildren<{
  config: QuizPlayerConfig;
}>) {
  const quiz = useQuizPlayer(config);

  return (
    <QuizContext.Provider value={{ quiz }}>{children}</QuizContext.Provider>
  );
}

/**
 * Hook to access quiz context
 */
export function useQuizContext<T = any>(): QuizContextValue<T> {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuizContext must be used within a QuizProvider");
  }
  return context;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Quiz player hook - Demonstrates domain-specific activity tracking
 *
 * Uses the core activity tracking system to manage quiz lifecycle,
 * answer validation, scoring, and state management within the chat canvas.
 *
 * @param config - Quiz configuration
 * @returns Quiz player state and controls
 */
export function useQuizPlayer(config: QuizPlayerConfig): UseQuizPlayerReturn {
  const {
    questions,
    validate,
    requireConfirm = false,
    defaultScreen = "welcome",
    attempts = [],
  } = config;

  // Core activity tracking integration from Player context
  const { state, store } = usePlayer<QuizStartArgs, QuizCompleteArgs>();

  // UI state (not persisted in store)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<unknown | null>(null);
  const [isAnswerValidated, setIsAnswerValidated] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [screen, setScreen] = useState<"welcome" | "quiz" | "end">(
    defaultScreen
  );

  const currentQuestion = questions[currentIndex];

  // Calculate score from events
  const score = useMemo(() => {
    return state.events.filter(
      (event) =>
        event.action === "quiz.answer" &&
        (event.data as Record<string, unknown>)?.isCorrect === true
    ).length;
  }, [state.events]);

  // Determine correctness of last answer
  const isCorrect = useMemo(() => {
    const answerEvents = state.events.filter(
      (event) => event.action === "quiz.answer"
    );
    const lastEvent = answerEvents.at(-1);
    return (lastEvent?.data as Record<string, unknown>)?.isCorrect === true;
  }, [state.events]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalAttempts = attempts.length;

    // Score in percentage
    const avgScore =
      totalAttempts === 0
        ? 0
        : attempts.reduce(
            (sum: number, attempt: any) => sum + (attempt.score?.scaled || 0),
            0
          ) / totalAttempts;

    // Score scaled to the number of questions
    const avgScoreScaled = Math.round(questions.length * avgScore);

    return { totalAttempts, avgScore: avgScoreScaled };
  }, [attempts, questions.length]);

  // Validate answer
  const validateAnswer = useCallback(
    async (answer: unknown) => {
      if (!currentQuestion) {
        return;
      }

      try {
        // Quiz validation logic (domain layer)
        let isAnswerCorrect = answer === currentQuestion.correctAnswer;
        if (validate) {
          try {
            isAnswerCorrect = await validate(
              answer,
              currentQuestion.correctAnswer
            );
          } catch (error) {
            console.error("Validation error:", error);
          }
        }

        // Send event to store (store-level hooks fire here)
        await store.sendEvent(
          QuizEvent.answer({
            questionId: currentQuestion.id,
            answer,
            isCorrect: isAnswerCorrect,
          })
        );

        // Update UI state
        setIsAnswerValidated(true);
        setIsTimerActive(false);
        await store.pause();
      } catch (error) {
        console.error("Failed to send answer event:", error);
      }
    },
    [currentQuestion, validate, store]
  );

  // Start quiz
  const start = useCallback(async () => {
    try {
      await store.start({
        metadata: { questionsCount: questions.length },
      });
      setScreen("quiz");
      setIsTimerActive(true);
    } catch (error) {
      console.error("Failed to start quiz:", error);
    }
  }, [store, questions.length]);

  // Next question or finish
  const handleNext = useCallback(async () => {
    if (currentIndex === questions.length - 1) {
      // Finish quiz
      try {
        await store.complete({
          score: {
            raw: score,
            max: questions.length,
            scaled: questions.length > 0 ? score / questions.length : 0,
          },
          totalQuestions: questions.length,
          metadata: {
            answeredCount: state.events.filter(
              (e) => e.action === "quiz.answer"
            ).length,
            hintUsed: state.events.filter(
              (e) => e.action === "quiz.request_hint"
            ).length,
          },
        });
        setScreen("end");
      } catch (error) {
        console.error("Failed to complete quiz:", error);
      }
      return;
    }

    // Move to next question
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswerValidated(false);
    setIsTimerActive(true);
    await store.play();
  }, [currentIndex, questions.length, score, state.events, store]);

  // Cancel quiz
  const handleCancel = useCallback(async () => {
    try {
      if (state.currentAttempt?.status === "in_progress") {
        await store.abandon();
      }
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswerValidated(false);
      setIsTimerActive(false);
      setScreen(defaultScreen);
    } catch (error) {
      console.error("Failed to abandon quiz:", error);
    }
  }, [state.currentAttempt, store, defaultScreen]);

  // Restart quiz
  const handleRestart = useCallback(async () => {
    if (screen !== "end") {
      return;
    }

    try {
      store.reset();
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswerValidated(false);
      setIsTimerActive(true);
      setScreen("quiz");
      await store.start({
        metadata: { questionsCount: questions.length },
      });
    } catch (error) {
      console.error("Failed to restart quiz:", error);
    }
  }, [screen, store, questions.length]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    if (currentQuestion && !isAnswerValidated) {
      // Send time-up event
      try {
        await store.sendEvent(
          QuizEvent.timeUp({
            questionId: currentQuestion.id,
          })
        );
      } catch (error) {
        console.error("Failed to send time-up event:", error);
      }

      setIsAnswerValidated(true);
      setIsTimerActive(false);
    }
  }, [currentQuestion, isAnswerValidated, store]);

  // Select answer
  const selectAnswer = useCallback(
    (answer: unknown) => {
      setSelectedAnswer(answer);
      if (!requireConfirm) {
        validateAnswer(answer);
      }
    },
    [requireConfirm, validateAnswer]
  );

  // Confirm answer
  const confirmAnswer = useCallback(async () => {
    if (selectedAnswer && !isAnswerValidated) {
      await validateAnswer(selectedAnswer);
    }
  }, [selectedAnswer, isAnswerValidated, validateAnswer]);

  return {
    state,
    store,
    currentQuestion,
    currentIndex,
    selectedAnswer,
    isAnswerValidated,
    isCorrect,
    score,
    stats,
    handlers: {
      selectAnswer,
      confirmAnswer,
      next: handleNext,
      cancel: handleCancel,
      start,
      restart: handleRestart,
      timeUp: handleTimeUp,
    },
    isTimerActive,
    screen,
    config,
  };
}
