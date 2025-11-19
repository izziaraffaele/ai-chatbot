import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AttemptState, AttemptStore } from "@/lib/activity-tracking";
import { cn } from "@/lib/utils";

/**
 * Player context interface
 */
type PlayerContextValue<START, COMPLETE> = {
  store: AttemptStore<START, COMPLETE>;
  state: AttemptState;
};

/**
 * Player context for activity state management
 */
const PlayerContext = createContext<PlayerContextValue<any, any> | null>(null);

/**
 * Player component props
 */
type PlayerProps<START, COMPLETE> = React.ComponentProps<"div"> & {
  store: AttemptStore<START, COMPLETE>;
  children: React.ReactNode;
};

/**
 * Player - Generic activity wrapper with state management
 *
 * Provides the context and state management for any activity type.
 * Activities should be wrapped in this component to access the store
 * and current state through the usePlayer hook.
 *
 * @param props - Player props
 * @returns Player component
 *
 * @example
 * ```tsx
 * <Player store={store}>
 *   <MyActivity />
 * </Player>
 * ```
 */
function PlayerRoot<START = unknown, COMPLETE = unknown>({
  store,
  children,
  className = "",
  ...props
}: PlayerProps<START, COMPLETE>) {
  const [state, setState] = useState<AttemptState>(() => store.getState());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(store.getState());
    });

    return unsubscribe;
  }, [store]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      const currentState = store.getState();
      if (currentState.currentAttempt?.status === "in_progress") {
        store.abandon({ metadata: { reason: "component_unmount" } });
      }
    };
  }, [store]);

  const contextValue: PlayerContextValue<START, COMPLETE> = useMemo(
    () => ({
      store,
      state,
    }),
    [store, state]
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      <div
        className={cn(
          "rounded-lg border border-border bg-secondary shadow-sm",
          className
        )}
        data-slot="player"
        {...props}
      >
        {children}
      </div>
    </PlayerContext.Provider>
  );
}

/**
 * Hook to access player context
 */
export function usePlayer<
  START = unknown,
  COMPLETE = unknown,
>(): PlayerContextValue<START, COMPLETE> {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used within a Player component");
  }

  return context as PlayerContextValue<START, COMPLETE>;
}

interface PlayerScreenProps extends React.ComponentProps<"div"> {
  variant?: "welcome" | "quiz" | "end";
}

const PlayerScreen = function PlayerScreen({
  variant = "quiz",
  className = "",
  children,
  ...props
}: PlayerScreenProps) {
  return (
    <div className={className} data-slot="player-screen" {...props}>
      {children}
    </div>
  );
};

interface PlayerHeaderProps extends React.ComponentProps<"div"> {}

const PlayerHeader = function PlayerHeader({
  className = "",
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div className={className} data-slot="player-header" {...props}>
      {children}
    </div>
  );
};

const PlayerHeaderActions = function PlayerHeaderActions({
  className = "",
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div
      className={cn("flex items-center space-x-2", className)}
      data-slot="player-header-actions"
      {...props}
    >
      {children}
    </div>
  );
};

const PlayerControls = function PlayerControls({
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div data-slot="player-controls" {...props}>
      {children}
    </div>
  );
};

type PlayerProgressProps = {
  current: number;
  total: number;
  showBar?: boolean;
  className?: string;
};

const PlayerProgress = function PlayerProgress({
  current,
  total,
  showBar = false,
  className,
}: PlayerProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={className} data-slot="player-progress">
      <span className="text-sm">
        {current} / {total}
      </span>
      {showBar && (
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

type PlayerTimerProps = {
  timeLimit: number; // in seconds
  isActive: boolean;
  onTimeUp: () => void;
  className?: string;
};

const PlayerTimer = function PlayerTimer({
  timeLimit,
  isActive,
  onTimeUp,
  className = "",
}: PlayerTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isWarning = timeRemaining <= 10 && timeRemaining > 5;
  const isDanger = timeRemaining <= 5;

  return (
    <div className={className} data-slot="player-timer">
      <span
        className={`font-mono text-sm ${
          isDanger
            ? "text-red-600"
            : isWarning
              ? "text-yellow-600"
              : "text-muted-foreground"
        }`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
};

export const Player = Object.assign(PlayerRoot, {
  Screen: PlayerScreen,
  Header: PlayerHeader,
  HeaderActions: PlayerHeaderActions,
  Controls: PlayerControls,
  Progress: PlayerProgress,
  Timer: PlayerTimer,
});
