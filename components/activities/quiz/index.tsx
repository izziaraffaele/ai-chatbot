import {
  ArrowRight,
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

// ============================================================================
// H-FARM STYLED QUIZ ACTIVITY
// Sophisticated Academic - clean, professional quiz experience
// ============================================================================

/**
 * Quiz Activity component - Main entry point for quiz activities
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
  activity: UIQuizActivity;
  requireConfirm?: boolean;
  validate?: (answer: unknown, correctAnswer: unknown) => Promise<boolean>;
  defaultScreen?: "welcome" | "quiz";
  attempts?: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    attemptedAt: Date;
  }>;
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
  const { quiz } = useQuizContext();
  const totalQuestions = quiz.config.questions.length;

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

  // Quiz questions screen - H-FARM styled
  if (quiz.currentQuestion) {
    const progressPercent = Math.round(
      ((quiz.currentIndex + 1) / totalQuestions) * 100
    );

    return (
      <div className="min-h-[500px] bg-background">
        {/* H-FARM Progress Header */}
        <div className="border-border border-b bg-muted/30 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              {title}
            </span>
            <span className="font-medium text-muted-foreground text-sm">
              {quiz.currentIndex + 1} / {totalQuestions}
            </span>
          </div>
          {/* Progress bar - H-FARM navy */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question content */}
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

          {/* Explanation box - shown after answer is confirmed */}
          {quiz.isAnswerValidated && quiz.currentQuestion?.explanation && (
            <Quiz.Explanation
              explanation={quiz.currentQuestion.explanation}
              isCorrect={quiz.isCorrect}
            />
          )}

          {/* Action buttons */}
          {quiz.selectedAnswer && !quiz.isAnswerValidated && (
            <div className="flex justify-center pt-2">
              <Button onClick={quiz.handlers.confirmAnswer} size="lg">
                Conferma risposta
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          )}

          {quiz.isAnswerValidated && (
            <div className="flex justify-center pt-2">
              <Button onClick={quiz.handlers.next} size="lg">
                {quiz.currentIndex < totalQuestions - 1
                  ? "Prossima domanda"
                  : "Termina quiz"}
                <ArrowRight className="ml-2 size-4" />
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
// Screen Components - H-FARM Styled
// ============================================================================

type QuizPlayerWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  questions: QuizQuestionType[];
  onStart: () => void;
  onCancel: () => void;
};

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
 * Quiz welcome screen - H-FARM styled
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

  const estimatedTimePerQuestion = 25;
  const totalTime = questions.length * estimatedTimePerQuestion;

  return (
    <div
      className="min-h-[500px] space-y-8 p-6"
      data-slot="quiz-player-welcome-screen"
    >
      {/* Header */}
      <div>
        {title && (
          <h2 className="mb-3 font-semibold text-2xl text-foreground tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {/* Stats - H-FARM card style */}
      <div className="rounded-md border border-border bg-card/50 p-5">
        <div className="mb-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Dettagli Quiz
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <ListChecks className="size-4 text-primary" />
            </div>
            <span className="font-medium">{questions.length} Domande</span>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Clock className="size-4 text-primary" />
            </div>
            <span className="font-medium">
              ~{estimatedTimePerQuestion}s per domanda
            </span>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Timer className="size-4 text-primary" />
            </div>
            <span className="font-medium">
              Tempo stimato: {formatTime(totalTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={onStart} size="lg">
          Inizia Quiz
          <ArrowRight className="ml-2 size-4" />
        </Button>
        <Button onClick={onCancel} variant="ghost">
          Annulla
        </Button>
      </div>
    </div>
  );
}

/**
 * Quiz end screen - H-FARM styled
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

  const avgScoreDisplay =
    stats.avgScore > 0
      ? `${Math.round(stats.avgScore * 100) / 100} / ${totalQuestions}`
      : `${score} / ${totalQuestions}`;

  return (
    <div
      className="min-h-[500px] space-y-8 p-6"
      data-slot="quiz-player-end-screen"
    >
      {/* Header - H-FARM styled */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="size-8 text-primary" />
        </div>
        <h2 className="mb-2 font-semibold text-2xl text-foreground tracking-tight">
          {t("quiz.completed.title", "Quiz completato!")}
        </h2>
        <p className="text-muted-foreground">
          {t("quiz.completed.subtitle", "Ecco i tuoi risultati")}
        </p>
      </div>

      {/* Score display - H-FARM prominent */}
      <div className="text-center">
        <div className="mb-2 font-bold text-5xl text-primary">
          {percentage}%
        </div>
        <div className="text-lg text-muted-foreground">
          {score} / {totalQuestions} risposte corrette
        </div>
      </div>

      {/* Stats Grid - H-FARM cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attempts Card */}
        <div className="rounded-md border border-border bg-card/50 p-4 text-center">
          <Target className="mx-auto mb-2 size-5 text-muted-foreground" />
          <div className="font-semibold text-foreground text-xl">
            {stats.totalAttempts}
          </div>
          <div className="text-muted-foreground text-xs uppercase tracking-wider">
            {t("quiz.completed.attempts", "Tentativi")}
          </div>
        </div>

        {/* Average Score Card */}
        <div className="rounded-md border border-border bg-card/50 p-4 text-center">
          <BarChart3 className="mx-auto mb-2 size-5 text-muted-foreground" />
          <div className="font-semibold text-foreground text-xl">
            {avgScoreDisplay}
          </div>
          <div className="text-muted-foreground text-xs uppercase tracking-wider">
            {t("quiz.completed.averageScore", "Media")}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        <Button onClick={onRestart} size="lg">
          <RotateCcw className="mr-2 size-4" />
          {t("quiz.feedback.restart", "Riprova")}
        </Button>

        {onFeedback && (
          <div className="flex gap-2 pt-2">
            <Button
              className="border-success/30 text-success hover:bg-success/10"
              onClick={() => onFeedback(5)}
              size="sm"
              variant="outline"
            >
              <Star className="mr-1 size-3" />
              {t("quiz.feedback.useful", "Utile")}
            </Button>
            <Button
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => onFeedback(1)}
              size="sm"
              variant="outline"
            >
              <Star className="mr-1 size-3" />
              {t("quiz.feedback.notUseful", "Non utile")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quiz Activity Empty component - H-FARM styled
 */
export function QuizActivityEmpty(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ListChecks className="size-6 text-muted-foreground" />
      </div>
      {props.title && (
        <h2 className="font-semibold text-foreground text-lg">{props.title}</h2>
      )}
      <p className="max-w-sm text-muted-foreground">
        {props.description || "Nessuna domanda disponibile per questo quiz."}
      </p>
    </div>
  );
}
