import { BarChart3, Clock, Play, RotateCcw, Star, Trophy } from "lucide-react";
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
      <div className="quiz-player-content space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-gray-600 text-sm">
          <span>
            {quiz.currentIndex + 1} / {totalQuestions} questions
          </span>
          <span>
            {Math.round(((quiz.currentIndex + 1) / totalQuestions) * 100)}%
            complete
          </span>
        </div>

        <Quiz.Question question={quiz.currentQuestion.question}>
          <Quiz.Choices>
            {quiz.currentQuestion.choices?.map(
              (choice: { value: unknown; label: string }) => (
                <Quiz.Choice
                  isCorrect={
                    quiz.isAnswerValidated &&
                    quiz.selectedAnswer === quiz.currentQuestion?.correctAnswer
                  }
                  isWrong={
                    quiz.isAnswerValidated &&
                    quiz.selectedAnswer !== quiz.currentQuestion?.correctAnswer
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
            <Button onClick={quiz.handlers.confirmAnswer}>Submit Answer</Button>
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
  const t = useTranslations();

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const estimatedTime = formatTime(questions.length * 30); // Estimate 30s per question

  return (
    <div className="quiz-welcome-screen space-y-6 py-8 text-center">
      <div className="space-y-4">
        {title && <h2 className="font-bold text-2xl text-gray-900">{title}</h2>}

        {description && (
          <p className="mx-auto max-w-md text-gray-600">{description}</p>
        )}

        <div className="flex items-center justify-center space-x-6 text-gray-500 text-sm">
          <div className="flex items-center space-x-1">
            <Trophy className="h-4 w-4" />
            <span>
              {questions.length} {t("quiz.welcome.questions", "questions")}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>~{estimatedTime}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3">
        <Button onClick={onCancel} variant="outline">
          {t("quiz.welcome.cancel", t("common.cancel", "Cancel"))}
        </Button>
        <Button onClick={onStart} size="lg">
          <Play className="mr-2 h-4 w-4" />
          {t("quiz.welcome.start", t("common.start", "Start Quiz"))}
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

  const percentage =
    totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const isPerfect = score === totalQuestions;
  const isGood = percentage >= 70;
  const isPassing = percentage >= 50;

  const getScoreColor = () => {
    if (isPerfect) {
      return "text-green-600";
    }
    if (isGood) {
      return "text-blue-600";
    }
    if (isPassing) {
      return "text-yellow-600";
    }
    return "text-gray-600";
  };

  const getScoreEmoji = () => {
    if (isPerfect) {
      return "🏆";
    }
    if (isGood) {
      return "🌟";
    }
    if (isPassing) {
      return "✅";
    }
    return "📚";
  };

  return (
    <div className="quiz-end-screen space-y-6 py-8 text-center">
      {/* Score display */}
      <div className="space-y-2">
        <div className={`font-bold text-6xl ${getScoreColor()}`}>
          {getScoreEmoji()}
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-2xl text-gray-900">
            {t("quiz.completed.title", "Quiz Completed!")}
          </h3>
          <div className={`font-bold text-3xl ${getScoreColor()}`}>
            {score} / {totalQuestions}
          </div>
          <div className="text-gray-600 text-lg">
            {percentage}
            {t("quiz.completed.correctPercentage", "% correct")}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center space-x-6 text-gray-500 text-sm">
        {stats.totalAttempts > 1 && (
          <div className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>
              {stats.totalAttempts} {t("quiz.completed.attempts", "attempts")}
            </span>
          </div>
        )}

        {stats.avgScore > 0 && (
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>
              {t("quiz.completed.average", "Avg: {score}%").replace(
                "{score}",
                Math.round(stats.avgScore).toString()
              )}
            </span>
          </div>
        )}
      </div>

      {/* Feedback */}
      {onFeedback && (
        <div className="space-y-2">
          <p className="text-gray-600 text-sm">
            {t("quiz.feedback.prompt", "How was this quiz?")}
          </p>
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                className="hover:bg-yellow-50 hover:text-yellow-600"
                key={rating}
                onClick={() => onFeedback(rating)}
                size="sm"
                variant="ghost"
              >
                <Star className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center space-x-3">
        <Button onClick={onRestart} size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("quiz.feedback.restart", t("common.restart", "Try Again"))}
        </Button>
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
    <div className="quiz-activity-empty space-y-4 py-8 text-center">
      {props.title && (
        <h2 className="font-semibold text-gray-900 text-xl">{props.title}</h2>
      )}
      <p className="text-gray-600">
        {props.description || "No questions available for this quiz."}
      </p>
    </div>
  );
}
