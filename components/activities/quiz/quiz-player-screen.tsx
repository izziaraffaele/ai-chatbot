import { BarChart3, Clock, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { QuizQuestion } from "./use-quiz-player";

/**
 * Quiz welcome screen props
 */
type QuizPlayerWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  questions: QuizQuestion[];
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
export function QuizPlayerWelcomeScreen({
  title,
  description,
  questions,
  onStart,
  onCancel,
}: QuizPlayerWelcomeScreenProps) {
  const t = useTranslations();

  return (
    <div className="quiz-welcome-screen space-y-6 py-8 text-center">
      <div className="space-y-4">
        {title && <h2 className="font-bold text-2xl text-gray-900">{title}</h2>}

        {description && (
          <p className="mx-auto max-w-md text-gray-600">{description}</p>
        )}

        <div className="flex items-center justify-center space-x-4 text-gray-500 text-sm">
          <div className="flex items-center space-x-1">
            <Trophy className="h-4 w-4" />
            <span>
              {questions.length} {t("quiz.welcome.questions", "questions")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3">
        <Button onClick={onCancel} variant="outline">
          {t("quiz.welcome.cancel", t("common.cancel", "Cancel"))}
        </Button>
        <Button onClick={onStart} size="lg">
          {t("quiz.welcome.start", t("common.start", "Start Quiz"))}
        </Button>
      </div>
    </div>
  );
}

/**
 * Quiz end screen
 */
export function QuizPlayerEndScreen({
  score,
  totalQuestions,
  stats,
  onRestart,
  onFeedback,
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
          {t("quiz.feedback.restart", t("common.restart", "Try Again"))}
        </Button>
      </div>
    </div>
  );
}
