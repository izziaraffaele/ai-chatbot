import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  RotateCcw,
  Shuffle,
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

// ============================================================================
// MEMORAIZ STYLED FLASHCARD ACTIVITY
// Vibrant brand colors - cyan accent, deep blue text
// ============================================================================

type FlashcardActivityProps = {
  activity: UIFlashcardActivity;
  shuffle?: boolean;
  showHints?: boolean;
  trackConfidence?: boolean;
  autoFlipDelay?: number;
  defaultScreen?: "welcome" | "study";
  sessions?: Array<{
    cardId: string;
    confidence: "low" | "medium" | "high";
    timeSpent: number;
    studiedAt: Date;
  }>;
  onFeedback?: (value: number) => void;
  /** Whether the flashcard activity is disabled (e.g., during chat streaming) */
  disabled?: boolean;
};

/**
 * Flashcard Activity component - Main entry point
 */
export function FlashcardActivity(props: FlashcardActivityProps) {
  const {
    activity,
    defaultScreen = "welcome",
    sessions = [],
    onFeedback,
    disabled = false,
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
        disabled={disabled}
        onFeedback={onFeedback}
        title={activity.title}
      />
    </FlashcardProvider>
  );
}

/**
 * Flashcard Activity Content - Internal composition
 */
function FlashcardActivityContent({
  title,
  description,
  onFeedback,
  disabled = false,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onFeedback?: (value: number) => void;
  disabled?: boolean;
}) {
  const { flashcard } = useFlashcardContext();
  const totalCards = flashcard.config.cards.length;

  if (flashcard.screen === "welcome") {
    return (
      <FlashcardActivityWelcomeScreen
        cards={flashcard.config.cards}
        description={description}
        disabled={disabled}
        onCancel={flashcard.handlers.cancel}
        onStart={flashcard.handlers.start}
        shuffle={flashcard.config.shuffle}
        title={title}
      />
    );
  }

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

  // Flashcard study screen - Memoraiz styled
  if (flashcard.currentCard) {
    const progressPercent = flashcard.progress.percentage;
    const showHint =
      flashcard.config.options?.showHints && flashcard.currentCard.hint;

    return (
      <div className="flex flex-col">
        {/* Memoraiz Progress Header */}
        <div className="border-border border-b bg-hf-cyan/5 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-hf-deep-blue/60 text-xs uppercase tracking-wider">
              {title || "Flashcards"}
            </span>
            <span className="font-medium text-hf-deep-blue/70 text-sm">
              {flashcard.currentIndex + 1} / {totalCards}
            </span>
          </div>
          {/* Progress bar - Memoraiz cyan */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-hf-cyan/20">
            <div
              className="h-full bg-hf-cyan transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Flashcard content with hint button */}
        <div className="flex-1 p-6">
          <div className="relative mx-auto max-w-lg">
            {/* Hint button positioned outside the card (top right) */}
            {showHint && (
              <div className="-right-20 -top-2 absolute z-10">
                <Flashcard.HintButton hint={flashcard.currentCard.hint ?? ""} />
              </div>
            )}

            <Flashcard
              disabled={disabled}
              flipped={flashcard.flipped}
              onClick={() => !disabled && flashcard.handlers.flip()}
              size="lg"
            >
              <Flashcard.Front>
                <Flashcard.Content>
                  <Flashcard.Label>Domanda</Flashcard.Label>
                  <Flashcard.Title>
                    {flashcard.currentCard.front}
                  </Flashcard.Title>
                  <Flashcard.RevealButton
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!disabled) {
                        flashcard.handlers.flip();
                      }
                    }}
                  />
                </Flashcard.Content>
              </Flashcard.Front>
              <Flashcard.Back>
                <Flashcard.Content>
                  <Flashcard.Label>Risposta</Flashcard.Label>
                  <Flashcard.Title>
                    {flashcard.currentCard.back}
                  </Flashcard.Title>
                </Flashcard.Content>
              </Flashcard.Back>
            </Flashcard>
          </div>
        </div>

        {/* Navigation - Memoraiz styled */}
        <div className="border-border border-t bg-hf-cyan/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              className="border-hf-cyan/30 text-hf-deep-blue hover:bg-hf-cyan/10"
              disabled={disabled || flashcard.currentIndex <= 0}
              onClick={flashcard.handlers.previous}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 size-4" />
              Precedente
            </Button>

            <div className="text-hf-deep-blue/60 text-sm">
              Clicca la card per girare
            </div>

            <div className="flex gap-2">
              {flashcard.config.options?.trackConfidence &&
                flashcard.hasSeenAnswer && (
                  <>
                    <Button
                      className="border-hf-red/30 text-hf-red hover:bg-hf-red/10"
                      disabled={disabled}
                      onClick={() => flashcard.handlers.rate("low")}
                      size="sm"
                      variant="outline"
                    >
                      <ThumbsDown className="mr-1 size-3" />
                      Difficile
                    </Button>
                    <Button
                      className="border-hf-yellow/30 text-hf-yellow hover:bg-hf-yellow/10"
                      disabled={disabled}
                      onClick={() => flashcard.handlers.rate("medium")}
                      size="sm"
                      variant="outline"
                    >
                      <Star className="mr-1 size-3" />
                      Ok
                    </Button>
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90"
                      disabled={disabled}
                      onClick={() => flashcard.handlers.rate("high")}
                      size="sm"
                    >
                      <Star className="mr-1 size-3" />
                      Facile
                    </Button>
                  </>
                )}
              <Button
                className="bg-hf-cyan text-white hover:bg-hf-cyan-light"
                disabled={disabled || !flashcard.hasSeenAnswer}
                onClick={flashcard.handlers.next}
                size="sm"
              >
                {flashcard.currentIndex < totalCards - 1
                  ? "Prossima"
                  : "Termina"}
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <FlashcardActivityEmpty description="Nessuna flashcard disponibile" />;
}

/**
 * Flashcard Activity Welcome - Standalone
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
 * Flashcard Activity End - Standalone
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
// Screen Components - Memoraiz Styled
// ============================================================================

type FlashcardActivityWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  cards: FlashcardType[];
  shuffle?: boolean;
  onStart: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

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
 * Flashcard welcome screen - Memoraiz styled
 */
function FlashcardActivityWelcomeScreen({
  title,
  description,
  cards,
  shuffle,
  onCancel,
  onStart,
  disabled = false,
}: FlashcardActivityWelcomeScreenProps) {
  const t = useTranslations();

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const estimatedTime = formatTime(cards.length * 10);

  return (
    <div className="space-y-8 p-6" data-slot="flashcard-welcome-screen">
      {/* Header */}
      <div>
        {title && (
          <h2 className="mb-3 font-semibold text-2xl text-hf-deep-blue tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-hf-deep-blue/70 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Stats - Memoraiz card style */}
      <div className="rounded-md border border-hf-cyan/20 bg-hf-cyan/5 p-5">
        <div className="mb-4 font-semibold text-hf-deep-blue/60 text-xs uppercase tracking-wider">
          Dettagli Studio
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-hf-deep-blue">
            <div className="flex size-8 items-center justify-center rounded-md bg-hf-cyan/10">
              <BookOpen className="size-4 text-hf-cyan" />
            </div>
            <span className="font-medium">
              {cards.length} {t("flashcards.welcome.cards", "carte")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-hf-deep-blue">
            <div className="flex size-8 items-center justify-center rounded-md bg-hf-cyan/10">
              <Clock className="size-4 text-hf-cyan" />
            </div>
            <span className="font-medium">~{estimatedTime} stimati</span>
          </div>

          {shuffle && (
            <div className="flex items-center gap-3 text-hf-deep-blue">
              <div className="flex size-8 items-center justify-center rounded-md bg-hf-cyan/10">
                <Shuffle className="size-4 text-hf-cyan" />
              </div>
              <span className="font-medium">Ordine casuale</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          className="bg-hf-cyan text-white hover:bg-hf-cyan-light"
          disabled={disabled}
          onClick={onStart}
          size="lg"
        >
          <Play className="mr-2 size-4" />
          {t("flashcards.welcome.start", "Inizia Studio")}
        </Button>
        <Button
          className="text-hf-deep-blue/70 hover:text-hf-deep-blue"
          disabled={disabled}
          onClick={onCancel}
          variant="ghost"
        >
          {t("flashcards.welcome.cancel", "Annulla")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard end screen - Memoraiz styled
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

  const _percentage =
    totalCards > 0 ? Math.round((stats.studiedCards / totalCards) * 100) : 0;

  const hasConfidence =
    stats.confidenceDistribution.low > 0 ||
    stats.confidenceDistribution.medium > 0 ||
    stats.confidenceDistribution.high > 0;

  return (
    <div className="space-y-8 p-6" data-slot="flashcard-end-screen">
      {/* Header - Memoraiz styled */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-hf-cyan/10">
          <BookOpen className="size-8 text-hf-cyan" />
        </div>
        <h2 className="mb-2 font-semibold text-2xl text-hf-deep-blue tracking-tight">
          {t("flashcards.completed.title", "Studio completato!")}
        </h2>
        <p className="text-hf-deep-blue/70">
          Ottimo lavoro con le tue flashcards
        </p>
      </div>

      {/* Score display - Memoraiz prominent */}
      <div className="text-center">
        <div className="mb-2 font-bold text-5xl text-hf-cyan">
          {stats.studiedCards}
        </div>
        <div className="text-hf-deep-blue/70 text-lg">
          carte studiate su {totalCards}
        </div>
      </div>

      {/* Stats - Memoraiz cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-hf-cyan/20 bg-hf-cyan/5 p-4 text-center">
          <Clock className="mx-auto mb-2 size-5 text-hf-cyan" />
          <div className="font-semibold text-hf-deep-blue text-xl">
            {formatTime(stats.totalTime)}
          </div>
          <div className="text-hf-deep-blue/60 text-xs uppercase tracking-wider">
            Tempo totale
          </div>
        </div>

        <div className="rounded-md border border-hf-cyan/20 bg-hf-cyan/5 p-4 text-center">
          <BarChart3 className="mx-auto mb-2 size-5 text-hf-cyan" />
          <div className="font-semibold text-hf-deep-blue text-xl">
            {formatTime(Math.round(stats.avgTimePerCard))}
          </div>
          <div className="text-hf-deep-blue/60 text-xs uppercase tracking-wider">
            Media/carta
          </div>
        </div>
      </div>

      {/* Confidence distribution */}
      {hasConfidence && (
        <div className="rounded-md border border-hf-cyan/20 bg-hf-cyan/5 p-4">
          <div className="mb-3 font-semibold text-hf-deep-blue/60 text-xs uppercase tracking-wider">
            {t("flashcards.completed.confidence", "Livelli di confidenza")}
          </div>
          <div className="flex items-center justify-center gap-6 text-hf-deep-blue text-sm">
            {stats.confidenceDistribution.high > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-success">🌟</span>
                <span className="font-medium">
                  {stats.confidenceDistribution.high} Facili
                </span>
              </div>
            )}
            {stats.confidenceDistribution.medium > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-hf-yellow">⭐</span>
                <span className="font-medium">
                  {stats.confidenceDistribution.medium} Ok
                </span>
              </div>
            )}
            {stats.confidenceDistribution.low > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-hf-red">💪</span>
                <span className="font-medium">
                  {stats.confidenceDistribution.low} Difficili
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback */}
      {onFeedback && (
        <div className="text-center">
          <p className="mb-3 text-hf-deep-blue/70 text-sm">
            {t("flashcards.feedback.prompt", "Come è andata questa sessione?")}
          </p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                className="hover:bg-hf-yellow/10 hover:text-hf-yellow"
                key={rating}
                onClick={() => onFeedback(rating)}
                size="sm"
                variant="ghost"
              >
                <Star className="size-4" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center">
        <Button
          className="bg-hf-cyan text-white hover:bg-hf-cyan-light"
          onClick={onRestart}
          size="lg"
        >
          <RotateCcw className="mr-2 size-4" />
          {t("flashcards.feedback.restart", "Studia ancora")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard Activity Empty - Memoraiz styled
 */
export function FlashcardActivityEmpty(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-hf-cyan/10">
        <BookOpen className="size-6 text-hf-cyan" />
      </div>
      {props.title && (
        <h2 className="font-semibold text-hf-deep-blue text-lg">
          {props.title}
        </h2>
      )}
      <p className="max-w-sm text-hf-deep-blue/70">
        {props.description ||
          "Nessuna flashcard disponibile per questa sessione."}
      </p>
    </div>
  );
}
