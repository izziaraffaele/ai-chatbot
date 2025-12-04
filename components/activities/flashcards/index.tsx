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
// H-FARM STYLED FLASHCARD ACTIVITY
// Sophisticated Academic - clean, professional flashcard experience
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
 * Flashcard Activity Content - Internal composition
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
  const { flashcard } = useFlashcardContext();
  const totalCards = flashcard.config.cards.length;

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

  // Flashcard study screen - H-FARM styled
  if (flashcard.currentCard) {
    const progressPercent = flashcard.progress.percentage;
    const showHint = flashcard.config.options?.showHints && flashcard.currentCard.hint;

    return (
      <div className="flex flex-col">
        {/* H-FARM Progress Header */}
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title || "Flashcards"}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {flashcard.currentIndex + 1} / {totalCards}
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

        {/* Flashcard content with hint button */}
        <div className="flex-1 p-6">
          <div className="relative mx-auto max-w-lg">
            {/* Hint button positioned outside the card (top right) */}
            {showHint && (
              <div className="absolute -right-20 -top-2 z-10">
                <Flashcard.HintButton hint={flashcard.currentCard.hint ?? ""} />
              </div>
            )}
            
            <Flashcard
              flipped={flashcard.flipped}
              onClick={() => flashcard.handlers.flip()}
              size="lg"
            >
              <Flashcard.Front>
                <Flashcard.Content>
                  <Flashcard.Label>Domanda</Flashcard.Label>
                  <Flashcard.Title>{flashcard.currentCard.front}</Flashcard.Title>
                  <Flashcard.RevealButton onClick={(e) => {
                    e.stopPropagation();
                    flashcard.handlers.flip();
                  }} />
                </Flashcard.Content>
              </Flashcard.Front>
              <Flashcard.Back>
                <Flashcard.Content>
                  <Flashcard.Label>Risposta</Flashcard.Label>
                  <Flashcard.Title>{flashcard.currentCard.back}</Flashcard.Title>
                </Flashcard.Content>
              </Flashcard.Back>
            </Flashcard>
          </div>
        </div>

        {/* Navigation - H-FARM styled */}
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              disabled={flashcard.currentIndex <= 0}
              onClick={flashcard.handlers.previous}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="mr-1 size-4" />
              Precedente
            </Button>

            <div className="text-sm text-muted-foreground">
              Clicca la card per girare
            </div>

            <div className="flex gap-2">
              {flashcard.config.options?.trackConfidence && flashcard.hasSeenAnswer && (
                <>
                  <Button
                    onClick={() => flashcard.handlers.rate("low")}
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <ThumbsDown className="mr-1 size-3" />
                    Difficile
                  </Button>
                  <Button
                    onClick={() => flashcard.handlers.rate("medium")}
                    size="sm"
                    variant="outline"
                  >
                    <Star className="mr-1 size-3" />
                    Ok
                  </Button>
                  <Button
                    onClick={() => flashcard.handlers.rate("high")}
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                  >
                    <Star className="mr-1 size-3" />
                    Facile
                  </Button>
                </>
              )}
              <Button 
                disabled={!flashcard.hasSeenAnswer}
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
// Screen Components - H-FARM Styled
// ============================================================================

type FlashcardActivityWelcomeScreenProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  cards: FlashcardType[];
  shuffle?: boolean;
  onStart: () => void;
  onCancel: () => void;
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
 * Flashcard welcome screen - H-FARM styled
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

  const estimatedTime = formatTime(cards.length * 10);

  return (
    <div className="space-y-8 p-6" data-slot="flashcard-welcome-screen">
      {/* Header */}
      <div>
        {title && (
          <h2 className="mb-3 font-semibold text-2xl tracking-tight text-foreground">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Stats - H-FARM card style */}
      <div className="rounded-md border border-border bg-card/50 p-5">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dettagli Studio
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="size-4 text-primary" />
            </div>
            <span className="font-medium">
              {cards.length} {t("flashcards.welcome.cards", "carte")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Clock className="size-4 text-primary" />
            </div>
            <span className="font-medium">~{estimatedTime} stimati</span>
          </div>

          {shuffle && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <Shuffle className="size-4 text-primary" />
              </div>
              <span className="font-medium">Ordine casuale</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={onStart} size="lg">
          <Play className="mr-2 size-4" />
          {t("flashcards.welcome.start", "Inizia Studio")}
        </Button>
        <Button onClick={onCancel} variant="ghost">
          {t("flashcards.welcome.cancel", "Annulla")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard end screen - H-FARM styled
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

  const hasConfidence =
    stats.confidenceDistribution.low > 0 ||
    stats.confidenceDistribution.medium > 0 ||
    stats.confidenceDistribution.high > 0;

  return (
    <div className="space-y-8 p-6" data-slot="flashcard-end-screen">
      {/* Header - H-FARM styled */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="size-8 text-primary" />
        </div>
        <h2 className="mb-2 font-semibold text-2xl tracking-tight text-foreground">
          {t("flashcards.completed.title", "Studio completato!")}
        </h2>
        <p className="text-muted-foreground">
          Ottimo lavoro con le tue flashcards
        </p>
      </div>

      {/* Score display - H-FARM prominent */}
      <div className="text-center">
        <div className="mb-2 font-bold text-5xl text-primary">
          {stats.studiedCards}
        </div>
        <div className="text-lg text-muted-foreground">
          carte studiate su {totalCards}
        </div>
      </div>

      {/* Stats - H-FARM cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-border bg-card/50 p-4 text-center">
          <Clock className="mx-auto mb-2 size-5 text-muted-foreground" />
          <div className="font-semibold text-xl text-foreground">
            {formatTime(stats.totalTime)}
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Tempo totale
          </div>
        </div>

        <div className="rounded-md border border-border bg-card/50 p-4 text-center">
          <BarChart3 className="mx-auto mb-2 size-5 text-muted-foreground" />
          <div className="font-semibold text-xl text-foreground">
            {formatTime(Math.round(stats.avgTimePerCard))}
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Media/carta
          </div>
        </div>
      </div>

      {/* Confidence distribution */}
      {hasConfidence && (
        <div className="rounded-md border border-border bg-card/50 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("flashcards.completed.confidence", "Livelli di confidenza")}
          </div>
          <div className="flex items-center justify-center gap-6 text-sm">
            {stats.confidenceDistribution.high > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-success">🌟</span>
                <span className="font-medium">{stats.confidenceDistribution.high} Facili</span>
              </div>
            )}
            {stats.confidenceDistribution.medium > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">⭐</span>
                <span className="font-medium">{stats.confidenceDistribution.medium} Ok</span>
              </div>
            )}
            {stats.confidenceDistribution.low > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-destructive">💪</span>
                <span className="font-medium">{stats.confidenceDistribution.low} Difficili</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback */}
      {onFeedback && (
        <div className="text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            {t("flashcards.feedback.prompt", "Come è andata questa sessione?")}
          </p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                className="hover:bg-primary/10 hover:text-primary"
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
        <Button onClick={onRestart} size="lg">
          <RotateCcw className="mr-2 size-4" />
          {t("flashcards.feedback.restart", "Studia ancora")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Flashcard Activity Empty - H-FARM styled
 */
export function FlashcardActivityEmpty(props: {
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <BookOpen className="size-6 text-muted-foreground" />
      </div>
      {props.title && (
        <h2 className="font-semibold text-lg text-foreground">{props.title}</h2>
      )}
      <p className="max-w-sm text-muted-foreground">
        {props.description || "Nessuna flashcard disponibile per questa sessione."}
      </p>
    </div>
  );
}
