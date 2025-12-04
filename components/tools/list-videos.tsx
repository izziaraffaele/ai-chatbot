"use client";

import equal from "fast-deep-equal";
import { Play, Video } from "lucide-react";
import { memo, useEffect, useMemo, useRef } from "react";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { cn } from "@/lib/utils";
import type { ChatToolProps } from "./types";

/**
 * Video Library widget kind constant
 */
export const VIDEO_LIBRARY_KIND = "video-library" as const;

/**
 * Video metadata from the listVideos tool
 */
type VideoMetadata = {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  thumbnailUrl?: string;
  folder: string;
  week?: string;
  lesson?: string;
};

/**
 * ListVideos Tool Output structure
 */
type ListVideosOutput = {
  success: boolean;
  error?: string;
  videos?: VideoMetadata[];
  totalCount?: number;
};

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ListVideos Tool UI Component
 *
 * Renders the output of the listVideos tool:
 * - Automatically opens the video library canvas panel
 * - Shows a summary card with video count and button to re-open
 */
function PureListVideosTool({ part }: ChatToolProps) {
  const output = part.output as ListVideosOutput | undefined;
  const { openTab } = useCanvasTabs();
  const hitboxRef = useRef<HTMLDivElement>(null);

  // Track which video set we've already auto-opened the panel for
  const autoOpenedForSignatureRef = useRef<string | null>(null);

  // Get videos from output
  const videos = useMemo(() => {
    if (output?.videos && output.videos.length > 0) {
      return output.videos;
    }
    return null;
  }, [output?.videos]);

  // Create a signature for the current video set to track auto-open state
  const videosSignature = useMemo(() => {
    if (!videos) {
      return null;
    }
    return `${videos.length}:${videos[0]?.id || ""}`;
  }, [videos]);

  // Handle click to open the panel
  const handleOpenPanel = () => {
    if (!videos) {
      return;
    }

    const boundingBox = hitboxRef.current?.getBoundingClientRect() ?? {
      top: window.innerHeight / 4,
      left: window.innerWidth / 2,
      width: 300,
      height: 200,
    };

    openTab(
      {
        documentId: "video-library",
        kind: VIDEO_LIBRARY_KIND,
        content: videos,
        title: "Libreria Video",
        isVisible: true,
        status: "idle",
        boundingBox: {
          top: boundingBox.top,
          left: boundingBox.left,
          width: boundingBox.width,
          height: boundingBox.height,
        },
      },
      "Libreria Video"
    );
  };

  // AUTO-OPEN: When videos are available, automatically open the video library panel
  useEffect(() => {
    if (!videos || !videosSignature) {
      return;
    }

    // Skip if already opened for this video set
    if (autoOpenedForSignatureRef.current === videosSignature) {
      return;
    }

    // Mark as opened for this video set
    autoOpenedForSignatureRef.current = videosSignature;

    // Open the panel
    openTab(
      {
        documentId: "video-library",
        kind: VIDEO_LIBRARY_KIND,
        content: videos,
        title: "Libreria Video",
        isVisible: true,
        status: "idle",
        boundingBox: {
          top: window.innerHeight / 4,
          left: window.innerWidth / 2,
          width: 300,
          height: 200,
        },
      },
      "Libreria Video"
    );
  }, [videos, videosSignature, openTab]);

  // If no output yet (streaming), show loading
  if (!output) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground text-sm">
        Caricamento video...
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

  // If videos returned - show summary card with button to re-open panel
  if (videos && videos.length > 0) {
    // Calculate total duration
    const totalDuration = videos.reduce((acc, v) => acc + v.duration, 0);

    return (
      <div ref={hitboxRef}>
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-all hover:bg-accent/50 hover:shadow-md"
          onClick={handleOpenPanel}
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400">
            <Video className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              Video del Corso
            </h3>
            <p className="text-muted-foreground text-xs">
              Clicca per aprire la libreria video
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <Play className="size-3" />
              {videos.length} video
            </span>
            <span className="text-muted-foreground">
              {formatDuration(totalDuration)} totali
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Fallback - empty state
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-muted-foreground text-sm">
      Nessun video trovato
    </div>
  );
}

/**
 * Memoized ListVideosTool component to prevent unnecessary re-renders
 * during streaming updates. Uses deep equality for part comparison.
 */
export const ListVideosTool = memo(PureListVideosTool, (prev, next) => {
  return equal(prev.part, next.part);
});

