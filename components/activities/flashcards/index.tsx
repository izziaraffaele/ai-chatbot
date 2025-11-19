import {
  BarChart3,
  Clock,
  Play,
  RotateCcw,
  Star,
  ThumbsDown,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/use-translations";
import { Flashcard } from "./components";
import type {
  FlashcardPlayerConfig,
  Flashcard as FlashcardType,
} from "./player";
import { FlashcardProvider, useFlashcardContext } from "./player";
import type { UIFlashcardActivity } from "./schema";

type FlashcardActivityProps = {
  /** Activity configuration with title, description, and payload */
  activity: UIFlashcardActivity;
  /** Whether to shuffle cards */
  shuffle?: boolean;
  /** Show hints when available */
  showHints?: boolean;
  /** Track confidence levels */
  trackConfidence?: boolean;
  /** Auto-flip after delay (ms) */
  autoFlipDelay?: number;
  /** Default screen to show */
  defaultScreen?: "welcome" | "study";
  /** Previous study sessions for statistics */
  sessions?: Array<{
    cardId: string;
    confidence: "low" | "medium" | "high";
    timeSpent: number;
    studiedAt: Date;
  }>;
  /** Optional feedback handler */
  onFeedback?: (value: number) => void;
};

/**
 * Flashcard Activity component - Main entry point for flashcard study sessions
 *
 * Provides the complete flashcard study experience with:
 * - Activity tracking integration
 * - Welcome/end screens
 * - Card navigation and flipping
 * - Confidence rating and statistics
 *
 * This component should be wrapped in an Activity component that provides the store.
 *
 * @example
 * ```typescript
 * <Activity store={createAttemptStore('flashcards-123', 'flashcards')}>
 *   <FlashcardActivity
 *     title="Spanish Vocabulary"
 *     cards={[
 *       { id: 'f1', front: 'Hola', back: 'Hello' },
 *       { id: 'f2', front: 'Gracias', back: 'Thank you' }
 *     ]}
 *     shuffle
 *   />
 * </Activity>
 * ```
 */
export function FlashcardActivity(props: FlashcardActivityProps) {
  const {
    activity,
    defaultScreen = "welcome",
    sessions = [],
    onFeedback,
    ...others
  } = props;

  const { shuffle = false, showHints, trackConfidence, autoFlipDelay } = others;

  const config = useMemo<FlashcardPlayerConfig>(
    () => ({
      cards: activity.payload,
      shuffle,
      options: {
        showHints,
        trackConfidence,
        autoFlipDelay,
      },
      defaultScreen,
      sessions,
    }),
    [
      shuffle,
      showHints,
      trackConfidence,
      autoFlipDelay,
      defaultScreen,
      sessions,
      activity.payload,
    ]
  );

  return (
    <FlashcardProvider config={config}>
      <FlashcardActivityContent
        description={activity.description}
        onFeedback={onFeedback}
        title={activity.title}
      />
    </FlashcardProvider>
  );
}

/**
 * Flashcard Activity Content component - Internal composition
 */
function FlashcardActivityContent({
  title,
  description,
  onFeedback,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onFeedback?: (value: number) => void;
}) {
  // Access flashcard state, handlers, and config from FlashcardProvider
  const { flashcard } = useFlashcardContext();
  const totalCards = flashcard.config.cards.length;

  // Show welcome screen
  if (flashcard.screen === "welcome") {
    return (
      <FlashcardActivityWelcomeScreen
        cards={flashcard.config.cards}
        description={description}
        onCancel={flashcard.handlers.cancel}
        onStart={flashcard.handlers.start}
        shuffle={flashcard.config.shuffle}
        title={title}
      />
    );
  }

  // Show end screen
  if (flashcard.screen === "end") {
    return (
      <FlashcardActivityEndScreen
        onFeedback={onFeedback}
        onRestart={flashcard.handlers.restart}
        stats={flashcard.stats}
        totalCards={totalCards}
      />
    );
  }

  // Show flashcard study
  if (flashcard.currentCard) {
    return (
      <div className="flashcard-activity-content space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-gray-600 text-sm">
          <span>
            {flashcard.progress.studied} / {totalCards} cards studied
          </span>
          <span>{flashcard.progress.percentage}% complete</span>
        </div>

        {/* Flashcard */}
        <div className="flex justify-center">
          <Flashcard
            flipped={flashcard.flipped}
            onClick={() => flashcard.handlers.flip()}
            size="lg"
          >
            <Flashcard.Front>
              <Flashcard.Content>
                <Flashcard.Label>Question</Flashcard.Label>
                <Flashcard.Title>{flashcard.currentCard.front}</Flashcard.Title>
                {flashcard.config.options?.showHints &&
                  flashcard.currentCard.hint && (
                    <Flashcard.Hint>
                      Hint: {flashcard.currentCard.hint}
                    </Flashcard.Hint>
                  )}
                <Flashcard.RevealButton />
              </Flashcard.Content>
            </Flashcard.Front>
            <Flashcard.Back>
              <Flashcard.Content>
                <Flashcard.Label>Answer</Flashcard.Label>
                <Flashcard.Title>{flashcard.currentCard.back}</Flashcard.Title>
              </Flashcard.Content>
            </Flashcard.Back>
          </Flashcard>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            disabled={flashcard.currentIndex <= 0}
            onClick={flashcard.handlers.previous}
            variant="outline"
          >
            Previous
          </Button>

          <div className="text-gray-600 text-sm">
            Card {flashcard.currentIndex + 1} of {totalCards}
          </div>

          {flashcard.flipped ? (
            <div className="flex gap-2">
              {flashcard.config.options?.trackConfidence && (
                <>
                  <Button
                    className="gap-1"
                    onClick={() => flashcard.handlers.rate("low")}
                    size="sm"
                    variant="outline"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Hard
                  </Button>
                  <Button
                    className="gap-1"
                    onClick={() => flashcard.handlers.rate("medium")}
                    size="sm"
                    variant="outline"
                  >
                    <Star className="h-4 w-4" />
                    Good
                  </Button>
                  <Button
                    className="gap-1"
                    onClick={() => flashcard.handlers.rate("high")}
                    size="sm"
                  >
                    <Star className="h-4 w-4" />
                    Easy
                  </Button>
                </>
              )}
              <Button onClick={flashcard.handlers.next}>
                {flashcard.currentIndex < totalCards - 1
                  ? "Next Card"
                  : "Finish"}
              </Button>
            </div>
          ) : (
            <Button onClick={flashcard.handlers.flip}>Reveal Answer</Button>
          )}
        </div>
      </div>
    );
  }

  return <FlashcardActivityEmpty description="No flashcards available" />;
}

/**
 * Flashcard Activity Welcome component - Standalone welcome screen
 */
export function FlashcardActivityWelcome(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  cards: FlashcardType[];
  shuffle?: boolean;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <FlashcardActivityWelcomeScreen
      cards={props.cards}
      description={props.description}
      onCancel={props.onCancel}
      onStart={props.onStart}
      shuffle={props.shuffle}
      title={props.title}
    />
  );
}

/**
 * Flashcard Activity End component - Standalone end screen
 */
export function FlashcardActivityEnd(props: {
  totalCards: number;
  stats: {
    studiedCards: number;
    totalTime: number;
    avgTimePerCard: number;
    confidenceDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
  onRestart: () => void;
  onFeedback?: (value: number) => void;
}) {
  return (
    <FlashcardActivityEndScreen
      onFeedback={props.onFeedback}
      onRestart={props.onRestart}
      stats={props.stats}
      totalCards={props.totalCards}
    />
  );
}

// ============================================================================
// Screen Components
// ============================================================================

/**
 * Flashcard welcome screen props
 */
type FlashcardActivityWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  cards: FlashcardType[];
  shuffle?: boolean;
  onStart: () => void;
  onCancel: () => void;
};

/**
 * Flashcard end screen props
 */
type FlashcardActivityEndScreenProps = {
  totalCards: number;
  stats: {
    studiedCards: number;
    totalTime: number;
    avgTimePerCard: number;
    confidenceDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
  onRestart: () => void;
  onFeedback?: (value: number) => void;
};

/**
 * Flashcard welcome screen
 */
function FlashcardActivityWelcomeScreen({
  title,
  description,
  cards,
  shuffle,
  onCancel,
  onStart,
}: FlashcardActivityWelcomeScreenProps) {
  const t = useTranslations();

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const estimatedTime = formatTime(cards.length * 10); // Estimate 10s per card

  return (
    <div className="flashcard-welcome-screen space-y-6 py-8 text-center">
      <div className="space-y-4">
        {title && <h2 className="font-bold text-2xl text-gray-900">{title}</h2>}

        {description && (
          <p className="mx-auto max-w-md text-gray-600">{description}</p>
        )}

        <div className="flex items-center justify-center space-x-6 text-gray-500 text-sm">
          <div className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>
              {cards.length} {t("flashcards.welcome.cards", "cards")}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>~{estimatedTime}</span>
          </div>

          {shuffle && (
            <div className="flex items-center space-x-1">
              <RotateCcw className="h-4 w-4" />
              <span>Shuffled</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3">
        <Button onClick={onCancel} variant="outline">
          {t("flashcards.welcome.cancel", t("common.cancel", "Cancel"))}
        </Button>
        <Button onClick={onStart} size="lg">
          <Play className="mr-2 h-4 w-4" />
          {t("flashcards.welcome.start", t("common.start", "Start Study"))}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard end screen
 */
function FlashcardActivityEndScreen({
  onFeedback,
  onRestart,
  stats,
  totalCards,
}: FlashcardActivityEndScreenProps) {
  const t = useTranslations();

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const percentage =
    totalCards > 0 ? Math.round((stats.studiedCards / totalCards) * 100) : 0;
  // const isPerfect = stats.studiedCards === totalCards;

  const getConfidenceEmoji = (confidence: string, _: number) => {
    return { high: "🌟", medium: "⭐", low: "💪" }[confidence];
  };

  return (
    <div className="flashcard-end-screen space-y-6 py-8 text-center">
      {/* Stats display */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-bold text-2xl text-gray-900">
            {t("flashcards.completed.title", "Study Session Complete!")}
          </h3>
          <div className="font-bold text-3xl text-blue-600">
            {stats.studiedCards} / {totalCards}
          </div>
          <div className="text-gray-600 text-lg">
            {percentage}% {t("flashcards.completed.studied", "cards studied")}
          </div>
        </div>

        {/* Time stats */}
        <div className="flex items-center justify-center space-x-6 text-gray-500 text-sm">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>{formatTime(stats.totalTime)}</span>
          </div>

          <div className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>{formatTime(Math.round(stats.avgTimePerCard))}/card</span>
          </div>
        </div>

        {/* Confidence distribution */}
        {stats.confidenceDistribution.low > 0 ||
        stats.confidenceDistribution.medium > 0 ||
        stats.confidenceDistribution.high > 0 ? (
          <div className="space-y-2">
            <div className="font-medium text-gray-600 text-sm">
              {t("flashcards.completed.confidence", "Confidence Levels")}
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm">
              {stats.confidenceDistribution.high > 0 && (
                <div className="flex items-center space-x-1">
                  <span>
                    {getConfidenceEmoji(
                      "high",
                      stats.confidenceDistribution.high
                    )}
                  </span>
                  <span>{stats.confidenceDistribution.high} Easy</span>
                </div>
              )}
              {stats.confidenceDistribution.medium > 0 && (
                <div className="flex items-center space-x-1">
                  <span>
                    {getConfidenceEmoji(
                      "medium",
                      stats.confidenceDistribution.medium
                    )}
                  </span>
                  <span>{stats.confidenceDistribution.medium} Good</span>
                </div>
              )}
              {stats.confidenceDistribution.low > 0 && (
                <div className="flex items-center space-x-1">
                  <span>
                    {getConfidenceEmoji(
                      "low",
                      stats.confidenceDistribution.low
                    )}
                  </span>
                  <span>{stats.confidenceDistribution.low} Hard</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Feedback */}
      {onFeedback && (
        <div className="space-y-2">
          <p className="text-gray-600 text-sm">
            {t("flashcards.feedback.prompt", "How was this study session?")}
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
          {t("flashcards.feedback.restart", t("common.restart", "Study Again"))}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard Activity Empty component - Empty state for when no cards are available
 */
export function FlashcardActivityEmpty(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flashcard-activity-empty space-y-4 py-8 text-center">
      {props.title && (
        <h2 className="font-semibold text-gray-900 text-xl">{props.title}</h2>
      )}
      <p className="text-gray-600">
        {props.description || "No flashcards available for this study session."}
      </p>
    </div>
  );
}
