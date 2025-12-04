"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FileText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  findCurrentSegmentIndex,
  formatTimestamp,
  type TranscriptData,
  type TranscriptSegment,
} from "@/lib/video/transcript";

// ============================================================================
// TYPES
// ============================================================================

export type VideoTranscriptProps = {
  /** Transcript data with segments */
  transcript: TranscriptData | null;
  /** Current video time in seconds */
  currentTime: number;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to toggle panel open/closed */
  onToggle: () => void;
  /** Callback when user clicks a segment to seek */
  onSeek: (time: number) => void;
  /** Optional className */
  className?: string;
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Toggle button to show/hide the transcript panel
 */
export function TranscriptToggleButton({
  isOpen,
  onToggle,
  hasTranscript,
  className,
}: {
  isOpen: boolean;
  onToggle: () => void;
  hasTranscript: boolean;
  className?: string;
}) {
  if (!hasTranscript) {
    return null;
  }

  return (
    <Button
      className={cn("gap-2", className)}
      onClick={onToggle}
      size="sm"
      title={isOpen ? "Nascondi trascrizione" : "Mostra trascrizione"}
      variant="outline"
    >
      <FileText className="size-4" />
      <span className="hidden sm:inline">Trascrizione</span>
      <ChevronRight
        className={cn(
          "size-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </Button>
  );
}

/**
 * Individual transcript segment row
 */
function TranscriptSegmentRow({
  segment,
  isActive,
  onClick,
}: {
  segment: TranscriptSegment;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "group flex w-full gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {formatTimestamp(segment.start)}
      </span>
      <span
        className={cn(
          "flex-1 text-sm leading-relaxed",
          isActive && "font-medium"
        )}
      >
        {segment.text.trim()}
      </span>
    </button>
  );
}

/**
 * VideoTranscript - Auto-scrolling transcript panel for video playback
 *
 * Features:
 * - Collapsible panel sliding from the right
 * - Auto-scrolls to keep current segment visible
 * - Highlights the currently playing segment
 * - Click-to-seek functionality
 */
export function VideoTranscript({
  transcript,
  currentTime,
  isOpen,
  onToggle,
  onSeek,
  className,
}: VideoTranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Find the current segment based on playback time
  const currentSegmentIndex = transcript
    ? findCurrentSegmentIndex(transcript.segments, currentTime)
    : -1;

  // Handle user scroll - temporarily disable auto-scroll
  const handleScroll = useCallback(() => {
    setUserScrolling(true);

    // Clear existing timeout
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }

    // Re-enable auto-scroll after 3 seconds of no scrolling
    userScrollTimeoutRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 3000);
  }, []);

  // Auto-scroll to active segment
  useEffect(() => {
    if (
      !userScrolling &&
      activeSegmentRef.current &&
      scrollContainerRef.current
    ) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSegmentIndex, userScrolling]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  if (!transcript) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate={{ width: "auto", opacity: 1 }}
          className={cn(
            "flex h-full flex-col border-border border-l bg-background",
            className
          )}
          exit={{ width: 0, opacity: 0 }}
          initial={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-border border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Trascrizione</h3>
            </div>
            <Button
              className="size-7"
              onClick={onToggle}
              size="icon"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Transcript content */}
          <div
            className="flex-1 overflow-y-auto p-2"
            onScroll={handleScroll}
            ref={scrollContainerRef}
            style={{ width: "320px" }}
          >
            <div className="flex flex-col gap-1">
              {transcript.segments.map((segment, index) => (
                <div
                  key={`${segment.start}-${index}`}
                  ref={index === currentSegmentIndex ? activeSegmentRef : null}
                >
                  <TranscriptSegmentRow
                    isActive={index === currentSegmentIndex}
                    onClick={() => onSeek(segment.start)}
                    segment={segment}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer with info */}
          <div className="shrink-0 border-border border-t px-4 py-2">
            <p className="text-muted-foreground text-xs">
              {transcript.segments.length} segmenti •{" "}
              {transcript.detected_language === "en" ? "Inglese" : "Italiano"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
