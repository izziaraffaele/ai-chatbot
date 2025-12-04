"use client";

import equal from "fast-deep-equal";
import { Clock, Play } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useCanvasTabs, getTabsState } from "@/hooks/use-canvas-tabs";
import { seekTo } from "@/lib/video/seek-store";
import { cn } from "@/lib/utils";
import type { ChatToolProps } from "./types";

/**
 * Video Library widget kind constant
 */
const VIDEO_LIBRARY_KIND = "video-library" as const;

/**
 * CDN base URL for videos
 */
const CDN_VIDEO_URL = "https://cdn.memoraiz.com/video/HFARM";

/**
 * SeekVideo Tool Output structure
 */
type SeekVideoOutput = {
  success: boolean;
  time: number;
  formattedTime: string;
  reason?: string;
  videoFolder?: string;
  videoTitle?: string;
  error?: string;
};

/**
 * Create a minimal video metadata object from tool output
 */
function createVideoMetadata(output: SeekVideoOutput) {
  if (!output.videoFolder) {
    return null;
  }

  // Create ID from folder name
  const id = output.videoFolder
    .toLowerCase()
    .replaceAll(/[^\da-z]/g, "-")
    .replaceAll(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Video URL from CDN
  const mp4Filename = `${output.videoFolder}.mp4`.replaceAll(" ", "+");
  const videoUrl = `${CDN_VIDEO_URL}/${mp4Filename}`;

  return {
    id,
    title: output.videoTitle || output.videoFolder,
    description: "",
    duration: 0,
    videoUrl,
    folder: output.videoFolder,
  };
}

/**
 * Check if video library tab is open with a video in player mode
 */
function isVideoLibraryOpen(): boolean {
  const state = getTabsState();
  return state.tabs.some((tab) => tab.artifact.kind === VIDEO_LIBRARY_KIND);
}

/**
 * SeekVideoTool UI Component
 *
 * Renders the output of the seekVideo tool:
 * - Shows a card with the timestamp and reason
 * - Opens the video library tab if closed
 * - Auto-seeks the video when the tool output is received
 * - Allows clicking to re-seek if needed
 */
function PureSeekVideoTool({ part }: ChatToolProps) {
  const output = part.output as SeekVideoOutput | undefined;
  const { openTab } = useCanvasTabs();
  const autoSeekedRef = useRef<string | null>(null);

  // Create a signature to track if we've already auto-seeked for this output
  const outputSignature = output
    ? `${output.time}:${output.formattedTime}:${output.reason || ""}:${output.videoFolder || ""}`
    : null;

  // Function to open video library and seek
  const openVideoAndSeek = useCallback(
    (seekOutput: SeekVideoOutput) => {
      const videoMeta = createVideoMetadata(seekOutput);

      if (videoMeta) {
        // Open the video library tab with this video
        openTab(
          {
            documentId: "video-library",
            kind: VIDEO_LIBRARY_KIND,
            content: [videoMeta], // Single video array
            title: videoMeta.title,
            isVisible: true,
            status: "idle",
            boundingBox: {
              top: window.innerHeight / 4,
              left: window.innerWidth / 2,
              width: 300,
              height: 200,
            },
          },
          videoMeta.title
        );

        // Delay seek to allow video player to mount
        setTimeout(() => {
          seekTo(seekOutput.time, seekOutput.reason);
        }, 500);
      } else {
        // No video context, just try to seek (might not work if canvas is closed)
        seekTo(seekOutput.time, seekOutput.reason);
      }
    },
    [openTab]
  );

  // Auto-seek when tool output is received
  useEffect(() => {
    if (!output?.success || !outputSignature) {
      return;
    }

    // Skip if already auto-seeked for this output
    if (autoSeekedRef.current === outputSignature) {
      return;
    }

    // Mark as auto-seeked
    autoSeekedRef.current = outputSignature;

    // Check if video library is already open
    if (isVideoLibraryOpen()) {
      // Just seek
      seekTo(output.time, output.reason);
    } else {
      // Open video and seek
      openVideoAndSeek(output);
    }
  }, [output, outputSignature, openVideoAndSeek]);

  // Handle click to re-seek
  const handleSeek = useCallback(() => {
    if (!output?.success) {
      return;
    }

    // Check if video library is already open
    if (isVideoLibraryOpen()) {
      seekTo(output.time, output.reason);
    } else {
      openVideoAndSeek(output);
    }
  }, [output, openVideoAndSeek]);

  // If no output yet (streaming), show loading
  if (!output) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground text-sm">
        Ricerca nel video...
      </div>
    );
  }

  // If error occurred
  if (!output.success && output.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {output.error}
      </div>
    );
  }

  // Success - show seek card
  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border",
        "bg-background p-4 text-left shadow-sm transition-all",
        "hover:bg-accent/50 hover:shadow-md"
      )}
      onClick={handleSeek}
      title="Clicca per andare a questo momento del video"
      type="button"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Play className="size-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <span className="font-mono font-semibold text-foreground">
            {output.formattedTime}
          </span>
        </div>
        {output.reason && (
          <p className="mt-1 text-muted-foreground text-sm">{output.reason}</p>
        )}
      </div>
      <span className="text-muted-foreground text-xs">Clicca per andare</span>
    </button>
  );
}

/**
 * Memoized SeekVideoTool component to prevent unnecessary re-renders
 * during streaming updates. Uses deep equality for part comparison.
 */
export const SeekVideoTool = memo(PureSeekVideoTool, (prev, next) => {
  return equal(prev.part, next.part);
});

