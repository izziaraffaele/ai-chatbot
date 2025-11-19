import React, { createContext, useContext, useMemo } from "react";
import type { AttemptState, AttemptStore } from "@/lib/activity-tracking";

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
interface PlayerProps<START, COMPLETE> extends React.ComponentProps<"div"> {
  store: AttemptStore<START, COMPLETE>;
  children: React.ReactNode;
  variant?: "default" | "contained" | "ghost";
}

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
export function Player<START = unknown, COMPLETE = unknown>({
  store,
  children,
  variant = "default",
  className = "",
  ...props
}: PlayerProps<START, COMPLETE>) {
  const [state, setState] = React.useState<AttemptState>(() =>
    store.getState()
  );

  // Subscribe to state changes
  React.useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(store.getState());
    });

    return unsubscribe;
  }, [store]);

  // Auto-cleanup on unmount
  React.useEffect(() => {
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

  const variantClasses = {
    default: "border border-gray-200 bg-white rounded-lg shadow-sm",
    contained: "bg-gray-50 border border-gray-200 rounded-lg",
    ghost: "bg-transparent border-0",
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      <div
        className={`player player-${variant} ${variantClasses[variant]} ${className}`}
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

/**
 * Player sub-components for composition
 */

Player.Root = Player;

interface PlayerScreenProps extends React.ComponentProps<"div"> {
  variant?: "welcome" | "quiz" | "end";
}

Player.Screen = function PlayerScreen({
  variant = "quiz",
  className = "",
  children,
  ...props
}: PlayerScreenProps) {
  return (
    <div
      className={`player-screen player-screen-${variant} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface PlayerHeaderProps extends React.ComponentProps<"div"> {}

Player.Header = function PlayerHeader({
  className = "",
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div className={`player-header ${className}`} {...props}>
      {children}
    </div>
  );
};

Player.HeaderActions = function PlayerHeaderActions({
  className = "",
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div
      className={`player-header-actions flex items-center space-x-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Player.Controls = function PlayerControls({
  className = "",
  children,
  ...props
}: PlayerHeaderProps) {
  return (
    <div className={`player-controls ${className}`} {...props}>
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

Player.Progress = function PlayerProgress({
  current,
  total,
  showBar = false,
  className = "",
}: PlayerProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={`player-progress ${className}`}>
      <span className="text-gray-600 text-sm">
        {current} / {total}
      </span>
      {showBar && (
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
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

Player.Timer = function PlayerTimer({
  timeLimit,
  isActive,
  onTimeUp,
  className = "",
}: PlayerTimerProps) {
  const [timeRemaining, setTimeRemaining] = React.useState(timeLimit);

  React.useEffect(() => {
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
    <div className={`player-timer ${className}`}>
      <span
        className={`font-mono text-sm ${
          isDanger
            ? "text-red-600"
            : isWarning
              ? "text-yellow-600"
              : "text-gray-600"
        }`}
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
};
