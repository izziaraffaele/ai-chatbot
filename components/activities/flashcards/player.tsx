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
 * Flashcard definition
 */
export type Flashcard = {
  /** Unique identifier for the card */
  id: string;
  /** Front content (question/prompt) */
  front: string;
  /** Back content (answer/explanation) */
  back: string;
  /** Optional hint */
  hint?: string;
  /** Optional category for organization */
  category?: string;
  /** Optional difficulty level */
  difficulty?: "easy" | "medium" | "hard";
};

/**
 * Flashcard study event data types
 */
export type FlashcardStudyEventData = {
  cardId: string;
  frontShown: boolean;
  timeSpent?: number;
} & Record<string, unknown>;

export type FlashcardFlipEventData = {
  cardId: string;
  timeToFlip?: number;
} & Record<string, unknown>;

export type FlashcardRateEventData = {
  cardId: string;
  confidence: "low" | "medium" | "high";
  timeSpent?: number;
} & Record<string, unknown>;

/**
 * Flashcard start arguments
 */
export type FlashcardStartArgs = {
  cardIds?: string[];
  shuffle?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Flashcard complete arguments
 */
export type FlashcardCompleteArgs = {
  studiedCards: number;
  totalTime: number;
  confidenceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  metadata?: Record<string, unknown>;
};

/**
 * Flashcard player configuration
 */
export type FlashcardPlayerConfig = {
  /** Flashcards to study */
  cards: Flashcard[];
  /** Whether to shuffle cards */
  shuffle?: boolean;
  /** Study session options */
  options?: {
    /** Show hints when available */
    showHints?: boolean;
    /** Track confidence levels */
    trackConfidence?: boolean;
    /** Auto-flip after delay (ms) */
    autoFlipDelay?: number;
  };
  /** Default screen to show */
  defaultScreen?: "welcome" | "study";
  /** Previous study sessions for statistics */
  sessions?: Array<{
    cardId: string;
    confidence: "low" | "medium" | "high";
    timeSpent: number;
    studiedAt: Date;
  }>;
};

/**
 * Flashcard player hook return type
 */
export type UseFlashcardPlayerReturn = {
  /** Current state from Player */
  state: AttemptState;
  /** Store instance from Player */
  store: AttemptStore<FlashcardStartArgs, FlashcardCompleteArgs>;
  /** Current flashcard */
  currentCard: Flashcard | null;
  /** Current card index in study order */
  currentIndex: number;
  /** Whether the current card is flipped */
  flipped: boolean;
  /** Whether the user has seen the answer for the current card (flipped at least once) */
  hasSeenAnswer: boolean;
  /** Progress information */
  progress: {
    current: number;
    total: number;
    percentage: number;
    studied: number;
    remaining: number;
  };
  /** Study session statistics */
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
  /** Event handlers */
  handlers: {
    start: () => Promise<void>;
    flip: () => Promise<void>;
    previous: () => Promise<void>;
    next: () => Promise<void>;
    rate: (confidence: "low" | "medium" | "high") => Promise<void>;
    cancel: () => Promise<void>;
    restart: () => Promise<void>;
  };
  /** Current screen */
  screen: "welcome" | "study" | "end";
  /** Flashcard configuration */
  config: FlashcardPlayerConfig;
};

/**
 * Flashcard context type
 */
export type FlashcardContextValue = {
  flashcard: UseFlashcardPlayerReturn;
};

// ============================================================================
// Events
// ============================================================================

/**
 * Flashcard event factory for type-safe event creation
 */
export const FlashcardEvent = {
  /**
   * Create study started event
   */
  studyStarted: (args: FlashcardStartArgs = {}) => ({
    action: "flashcard.study.started" as const,
    data: args,
  }),

  /**
   * Create card shown event
   */
  cardShown: (data: FlashcardStudyEventData) => ({
    action: "flashcard.card.shown" as const,
    data,
  }),

  /**
   * Create card flipped event
   */
  cardFlipped: (data: FlashcardFlipEventData) => ({
    action: "flashcard.card.flipped" as const,
    data,
  }),

  /**
   * Create card rated event
   */
  cardRated: (data: FlashcardRateEventData) => ({
    action: "flashcard.card.rated" as const,
    data,
  }),
};

// ============================================================================
// Context
// ============================================================================

const FlashcardContext = createContext<FlashcardContextValue | null>(null);

/**
 * Hook to access flashcard context
 */
export function useFlashcardContext(): FlashcardContextValue {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error(
      "useFlashcardContext must be used within a FlashcardProvider"
    );
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function FlashcardProvider({
  children,
  config,
}: React.PropsWithChildren<{
  config: FlashcardPlayerConfig;
}>) {
  const flashcard = useFlashcardPlayer(config);

  return (
    <FlashcardContext.Provider value={{ flashcard }}>
      {children}
    </FlashcardContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Flashcard player hook - Demonstrates domain-specific activity tracking
 *
 * Uses the core activity tracking system to manage flashcard study sessions,
 * card navigation, confidence rating, and state management within the chat canvas.
 *
 * @param config - Flashcard player configuration
 * @returns Flashcard player state and controls
 */
export function useFlashcardPlayer(
  config: FlashcardPlayerConfig
): UseFlashcardPlayerReturn {
  const { cards, shuffle, defaultScreen = "welcome" } = config;

  // Core activity tracking integration from Player context
  const { state, store } = usePlayer<
    FlashcardStartArgs,
    FlashcardCompleteArgs
  >();

  // UI state (not persisted in store)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hasSeenAnswer, setHasSeenAnswer] = useState(false);
  const [studiedCards, setStudiedCards] = useState<any[]>([]);
  const [screen, setScreen] = useState<"welcome" | "study" | "end">(
    defaultScreen
  );

  // Determine study order
  const studyOrder = useMemo(() => {
    const order = Array.from({ length: cards.length }, (_, i) => i);
    return shuffle ? [...order].sort(() => Math.random() - 0.5) : order;
  }, [cards.length, shuffle]);

  // Get current card
  const currentCard = useMemo(() => {
    if (screen === "welcome" || screen === "end") {
      return null;
    }
    const cardIndex = studyOrder[currentIndex];
    return cards[cardIndex] || null;
  }, [currentIndex, studyOrder, cards, screen]);

  // Calculate progress
  const progress = useMemo(() => {
    const current = currentIndex + 1;
    const total = cards.length;
    const studied = studiedCards.length;
    const remaining = total - studied;

    return {
      current,
      total,
      percentage: total > 0 ? Math.round((studied / total) * 100) : 0,
      studied,
      remaining,
    };
  }, [currentIndex, studiedCards.length, cards.length]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTime = studiedCards.reduce(
      (sum, card) => sum + (card.timeSpent || 0),
      0
    );
    const avgTimePerCard =
      studiedCards.length > 0 ? totalTime / studiedCards.length : 0;

    const confidenceDistribution = studiedCards.reduce(
      (acc, card) => {
        acc[card.confidence || "medium"]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    return {
      studiedCards: studiedCards.length,
      totalTime,
      avgTimePerCard,
      confidenceDistribution,
    };
  }, [studiedCards]);

  // Event handlers
  const start = useCallback(async () => {
    try {
      // Check if already in progress - resume instead of starting new
      const currentAttempt = state.currentAttempt;
      if (currentAttempt?.status === "in_progress") {
        setScreen("study");
        return;
      }

      // If attempt exists but completed/abandoned, reset first
      if (currentAttempt) {
        store.reset();
      }

      await store.start({
        cardIds: cards.map((c) => c.id),
        shuffle,
        metadata: { cardsCount: cards.length },
      });
      setScreen("study");
      await store.sendEvent(
        FlashcardEvent.studyStarted({
          cardIds: cards.map((c) => c.id),
          shuffle,
        })
      );
    } catch (error) {
      console.error("Failed to start flashcard session:", error);
    }
  }, [store, cards, shuffle, state.currentAttempt]);

  const flip = useCallback(async () => {
    if (!currentCard) {
      return;
    }

    const newFlipped = !flipped;
    setFlipped(newFlipped);
    
    // Mark as seen when showing the answer (back side)
    if (newFlipped) {
      setHasSeenAnswer(true);
    }
    
    await store.sendEvent(
      FlashcardEvent.cardFlipped({ cardId: currentCard.id })
    );
  }, [currentCard, flipped, store]);

  const previous = useCallback(async () => {
    if (currentIndex <= 0) {
      return;
    }

    setCurrentIndex((prev) => prev - 1);
    setFlipped(false);
    setHasSeenAnswer(false);

    if (currentCard) {
      await store.sendEvent(
        FlashcardEvent.cardShown({ cardId: currentCard.id, frontShown: true })
      );
    }
  }, [currentIndex, currentCard, store]);

  const next = useCallback(async () => {
    if (currentIndex >= cards.length - 1) {
      // End study session
      try {
        await store.complete({
          studiedCards: studiedCards.length,
          totalTime: stats.totalTime,
          confidenceDistribution: stats.confidenceDistribution,
          metadata: { cardsCount: cards.length },
        });
        setScreen("end");
      } catch (error) {
        console.error("Failed to complete flashcard session:", error);
      }
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setFlipped(false);
    setHasSeenAnswer(false);

    if (currentCard) {
      await store.sendEvent(
        FlashcardEvent.cardShown({ cardId: currentCard.id, frontShown: true })
      );
    }
  }, [
    currentIndex,
    cards.length,
    studiedCards.length,
    stats,
    currentCard,
    store,
  ]);

  const rate = useCallback(
    async (confidence: "low" | "medium" | "high") => {
      if (!currentCard) {
        return;
      }

      const timeSpent = 5; // Simplified time tracking

      // Add to studied cards
      setStudiedCards((prev) => [
        ...prev,
        {
          cardId: currentCard.id,
          confidence,
          timeSpent,
          studiedAt: new Date(),
        },
      ]);

      await store.sendEvent(
        FlashcardEvent.cardRated({
          cardId: currentCard.id,
          confidence,
          timeSpent,
        })
      );

      // Auto-advance to next card
      await next();
    },
    [currentCard, next, store]
  );

  const cancel = useCallback(async () => {
    try {
      if (state.currentAttempt?.status === "in_progress") {
        await store.abandon();
      }
      setCurrentIndex(0);
      setFlipped(false);
      setHasSeenAnswer(false);
      setStudiedCards([]);
      setScreen(defaultScreen);
    } catch (error) {
      console.error("Failed to cancel flashcard session:", error);
    }
  }, [state.currentAttempt, store, defaultScreen]);

  const restart = useCallback(async () => {
    if (screen !== "end") {
      return;
    }

    try {
      store.reset();
      setCurrentIndex(0);
      setFlipped(false);
      setHasSeenAnswer(false);
      setStudiedCards([]);
      setScreen("study");
      await store.start({
        cardIds: cards.map((c) => c.id),
        shuffle,
        metadata: { cardsCount: cards.length },
      });
    } catch (error) {
      console.error("Failed to restart flashcard session:", error);
    }
  }, [screen, store, cards, shuffle]);

  return {
    state,
    store,
    currentCard,
    currentIndex,
    flipped,
    hasSeenAnswer,
    progress,
    stats,
    handlers: {
      start,
      flip,
      previous,
      next,
      rate,
      cancel,
      restart,
    },
    screen,
    config,
  };
}
