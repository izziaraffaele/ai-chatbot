import {
  BarChart3,
  Clock,
  ListChecks,
  RotateCcw,
  Star,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Quiz } from "./components";
import type {
  QuizPlayerConfig,
  QuizQuestion as QuizQuestionType,
} from "./player";
import { QuizProvider, useQuizContext } from "./player";
import type { UIQuizActivity } from "./schema";

/**
 * Quiz Activity component - Main entry point for quiz activities
 *
 * Provides the complete quiz experience with:
 * - Activity tracking integration
 * - Welcome/end screens
 * - Question navigation
 * - Score tracking and statistics
 *
 * This component should be wrapped in an Activity component that provides the store.
 *
 * @example
 * ```typescript
 * <Activity store={createAttemptStore('quiz-123', 'quiz')}>
 *   <QuizActivity
 *     title="Math Quiz"
 *     questions={[
 *       { id: 'q1', question: 'What is 2+2?', correctAnswer: 4, choices: [
 *         { value: 3, label: '3' },
 *         { value: 4, label: '4' },
 *         { value: 5, label: '5' }
 *       ]}
 *     ]}
 *     requireConfirm
 *   />
 * </Activity>
 * ```
 */
export function QuizActivity(props: QuizActivityProps) {
  const {
    activity,
    defaultScreen = "welcome",
    attempts = [],
    onFeedback,
    ...others
  } = props;

  const { requireConfirm = false, validate } = others;

  const config = useMemo<QuizPlayerConfig>(
    () => ({
      questions: activity.payload,
      requireConfirm,
      validate,
      defaultScreen,
      attempts,
    }),
    [requireConfirm, validate, defaultScreen, attempts, activity.payload]
  );

  return (
    <QuizProvider config={config}>
      <QuizActivityContent
        description={activity.description}
        onFeedback={onFeedback}
        title={activity.title}
      />
    </QuizProvider>
  );
}

type QuizActivityProps = {
  /** Activity configuration with title, description, and payload */
  activity: UIQuizActivity;
  /** Whether to require confirmation before submitting answers */
  requireConfirm?: boolean;
  /** Optional validation function for custom answer checking */
  validate?: (answer: unknown, correctAnswer: unknown) => Promise<boolean>;
  /** Default screen to show */
  defaultScreen?: "welcome" | "quiz";
  /** Previous quiz attempts for statistics */
  attempts?: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    attemptedAt: Date;
  }>;
  /** Optional feedback handler */
  onFeedback?: (value: number) => void;
};

/**
 * Quiz Activity Content component - Internal composition
 */
function QuizActivityContent({
  title,
  description,
  onFeedback,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onFeedback?: (value: number) => void;
}) {
  // Access quiz state, handlers, and config from QuizProvider
  const { quiz } = useQuizContext();
  const totalQuestions = quiz.config.questions.length;

  // Show welcome screen
  if (quiz.screen === "welcome") {
    return (
      <QuizPlayerWelcomeScreen
        description={description}
        onCancel={quiz.handlers.cancel}
        onStart={quiz.handlers.start}
        questions={quiz.config.questions}
        title={title}
      />
    );
  }

  // Show end screen
  if (quiz.screen === "end") {
    return (
      <QuizPlayerEndScreen
        onFeedback={onFeedback}
        onRestart={quiz.handlers.restart}
        score={quiz.score}
        stats={quiz.stats}
        totalQuestions={totalQuestions}
      />
    );
  }

  // Show quiz questions
  if (quiz.currentQuestion) {
    return (
      <div className="bg-background">
        <div className="w-full bg-secondary px-4 py-3.5 text-muted-foreground">
          <div className="mb-2 font-semibold">{title}</div>
          {/* Progress indicator */}
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span>
              {quiz.currentIndex + 1} / {totalQuestions} questions
            </span>
            <span>
              {Math.round(((quiz.currentIndex + 1) / totalQuestions) * 100)}%
              complete
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <Quiz.Question question={quiz.currentQuestion.question}>
            <Quiz.Choices>
              {quiz.currentQuestion.choices?.map(
                (choice: { value: unknown; label: string }) => (
                  <Quiz.Choice
                    disabled={
                      quiz.isAnswerValidated ||
                      (quiz.selectedAnswer !== null &&
                        !quiz.config.requireConfirm)
                    }
                    isCorrect={
                      quiz.isAnswerValidated &&
                      choice.value === quiz.currentQuestion?.correctAnswer
                    }
                    isWrong={
                      quiz.isAnswerValidated &&
                      quiz.selectedAnswer === choice.value &&
                      choice.value !== quiz.currentQuestion?.correctAnswer
                    }
                    key={String(choice.value)}
                    onClick={() => quiz.handlers.selectAnswer(choice.value)}
                    selected={quiz.selectedAnswer === choice.value}
                  >
                    {choice.label}
                  </Quiz.Choice>
                )
              )}
            </Quiz.Choices>
          </Quiz.Question>

          {quiz.selectedAnswer && !quiz.isAnswerValidated && (
            <div className="flex justify-center">
              <Button onClick={quiz.handlers.confirmAnswer}>
                Submit Answer
              </Button>
            </div>
          )}

          {quiz.isAnswerValidated && (
            <div className="flex justify-center">
              <Button onClick={quiz.handlers.next}>
                {quiz.currentIndex < totalQuestions - 1
                  ? "Next Question"
                  : "Finish Quiz"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <QuizActivityEmpty description="No questions available" />;
}

/**
 * Quiz Activity Welcome component - Standalone welcome screen
 */
export function QuizActivityWelcome(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  questions: QuizQuestionType[];
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <QuizPlayerWelcomeScreen
      description={props.description}
      onCancel={props.onCancel}
      onStart={props.onStart}
      questions={props.questions}
      title={props.title}
    />
  );
}

/**
 * Quiz Activity End component - Standalone end screen
 */
export function QuizActivityEnd(props: {
  score: number;
  totalQuestions: number;
  stats: {
    totalAttempts: number;
    avgScore: number;
  };
  onRestart: () => void;
  onFeedback?: (value: number) => void;
}) {
  return (
    <QuizPlayerEndScreen
      onFeedback={props.onFeedback}
      onRestart={props.onRestart}
      score={props.score}
      stats={props.stats}
      totalQuestions={props.totalQuestions}
    />
  );
}

// ============================================================================
// Screen Components
// ============================================================================

/**
 * Quiz welcome screen props
 */
type QuizPlayerWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  questions: QuizQuestionType[];
  onStart: () => void;
  onCancel: () => void;
};

/**
 * Quiz end screen props
 */
type QuizPlayerEndScreenProps = {
  score: number;
  totalQuestions: number;
  stats: {
    totalAttempts: number;
    avgScore: number;
  };
  onRestart: () => void;
  onFeedback?: (value: number) => void;
};

/**
 * Quiz welcome screen
 */
function QuizPlayerWelcomeScreen({
  title,
  description,
  questions,
  onCancel,
  onStart,
}: QuizPlayerWelcomeScreenProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} secondi`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minuti`;
  };

  const estimatedTimePerQuestion = 25; // seconds per question
  const totalTime = questions.length * estimatedTimePerQuestion;

  return (
    <div className="space-y-6 p-6" data-slot="quiz-player-welcome-screen">
      <div className="">
        {title && <h2 className="mb-4 font-bold text-3xl">{title}</h2>}

        {description && <p className="mb-8 text-lg">{description}</p>}

        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <ListChecks className="h-5 w-5" />
            <span>{questions.length} Domande</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span>Circa {estimatedTimePerQuestion} secondi per domanda.</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Timer className="h-5 w-5" />
            <span>Tempo totale: {formatTime(totalTime)}.</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onStart}>Inizia</Button>
        <Button onClick={onCancel} variant="ghost">
          Annulla
        </Button>
      </div>
    </div>
  );
}

/**
 * Quiz end screen
 */
function QuizPlayerEndScreen({
  onFeedback,
  onRestart,
  score,
  stats,
  totalQuestions,
}: QuizPlayerEndScreenProps) {
  const t = useTranslations();

  const avgScoreDisplay =
    stats.avgScore > 0
      ? `${Math.round(stats.avgScore * 100) / 100} / ${totalQuestions}`
      : `${score} / ${totalQuestions}`;

  return (
    <div
      className="space-y-8 p-6 text-center"
      data-slot="quiz-player-end-screen"
    >
      {/* Header */}
      <div className="mb-8">
        <Trophy
          aria-hidden="true"
          className="mx-auto mb-4 h-12 w-12 text-yellow-500"
        />
        <h2 className="mb-2 font-bold text-3xl">
          {t("quiz.completed.title", "Quiz completato!")}
        </h2>
        <p className="text-muted-foreground">
          {t("quiz.completed.subtitle", "Ecco come sei andato")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Score Card */}
        <div className="rounded-lg bg-muted p-4 text-center">
          <Trophy
            aria-hidden="true"
            className="mx-auto mb-2 h-6 w-6 text-foreground"
          />
          <div className="font-bold text-2xl text-foreground">
            {score} / {totalQuestions}
          </div>
          <div className="text-foreground text-sm">
            {t("quiz.completed.score", "Punteggio ottenuto")}
          </div>
        </div>

        {/* Attempts Card */}
        <div className="rounded-lg border-2 border-muted p-4 text-center">
          <Target
            aria-hidden="true"
            className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
          />
          <div className="font-bold text-2xl text-muted-foreground">
            {stats.totalAttempts}
          </div>
          <div className="text-muted-foreground text-sm">
            {t("quiz.completed.attempts", "Tentativi")}
          </div>
        </div>

        {/* Average Score Card */}
        <div className="rounded-lg border-2 border-muted p-4 text-center">
          <BarChart3
            aria-hidden="true"
            className="mx-auto mb-2 h-6 w-6 text-muted-foreground"
          />
          <div className="font-bold text-2xl text-muted-foreground">
            {avgScoreDisplay}
          </div>
          <div className="text-muted-foreground text-sm">
            {t("quiz.completed.averageScore", "Punteggio medio")}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mx-auto max-w-xs space-y-4">
        <Button onClick={onRestart} size="lg">
          <RotateCcw />
          {t("quiz.feedback.restart", "Riprova")}
        </Button>

        {onFeedback && (
          <div className="flex gap-4">
            <Button
              className="bg-success/10 text-success hover:bg-success/20"
              onClick={() => onFeedback(5)}
              variant="outline"
            >
              <Star />
              {t("quiz.feedback.useful", "Utile")}
            </Button>
            <Button
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => onFeedback(1)}
              variant="outline"
            >
              <Star />
              {t("quiz.feedback.notUseful", "Non utile")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quiz Activity Empty component - Empty state for when no questions are available
 */
export function QuizActivityEmpty(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 py-8 text-center">
      {props.title && <h2 className="font-semibold text-xl">{props.title}</h2>}

      <p className="text-muted-foreground">
        {props.description || "No questions available for this quiz."}
      </p>
    </div>
  );
}
