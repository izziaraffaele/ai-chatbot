/**
 * Video Seek Store
 *
 * A simple pub/sub store for communicating video seek events
 * between tool components and the video player.
 *
 * Pattern:
 * 1. SeekVideoTool component calls seekTo(time) when tool output is received
 * 2. VideoPlayerView subscribes and seeks the video element when event fires
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Seek event payload
 */
export type SeekEvent = {
  /** Target time in seconds */
  time: number;
  /** Optional reason/context for the seek */
  reason?: string;
  /** Timestamp when the event was created */
  timestamp: number;
};

/**
 * Subscriber callback type
 */
type SeekSubscriber = (event: SeekEvent) => void;

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

/**
 * Internal store state
 */
let currentEvent: SeekEvent | null = null;
const subscribers = new Set<SeekSubscriber>();

/**
 * Seek to a specific time in the video
 *
 * @param time - Target time in seconds
 * @param reason - Optional reason/context for the seek
 */
export function seekTo(time: number, reason?: string): void {
  const event: SeekEvent = {
    time,
    reason,
    timestamp: Date.now(),
  };

  currentEvent = event;

  // Notify all subscribers
  for (const subscriber of subscribers) {
    try {
      subscriber(event);
    } catch (error) {
      console.error("[SeekStore] Subscriber error:", error);
    }
  }
}

/**
 * Subscribe to seek events
 *
 * @param callback - Function to call when a seek event occurs
 * @returns Unsubscribe function
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   return subscribeToSeek((event) => {
 *     videoRef.current.currentTime = event.time;
 *   });
 * }, []);
 * ```
 */
export function subscribeToSeek(callback: SeekSubscriber): () => void {
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Get the current/last seek event
 *
 * @returns The last seek event, or null if none
 */
export function getCurrentSeekEvent(): SeekEvent | null {
  return currentEvent;
}

/**
 * Clear the current seek event
 * Call this after processing to prevent re-seeking
 */
export function clearSeekEvent(): void {
  currentEvent = null;
}

/**
 * Check if there's a pending seek event
 */
export function hasPendingSeek(): boolean {
  return currentEvent !== null;
}

