"use client";

import { Play, Video } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageBody,
  ChatMessageBubble,
} from "@/components/chat/message";
import { MessageResponse } from "@/components/elements/message";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { cn } from "@/lib/utils";

/**
 * Video Library widget kind constant
 */
const VIDEO_LIBRARY_KIND = "video-library" as const;

/**
 * Video metadata type
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
 * API response type
 */
type VideosResponse = {
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
 * Welcome message text content
 */
const WELCOME_MESSAGE_TEXT = `Ciao! 👋 I'm your **H-FARM College** assistant.

I can help you with:
- **Answering questions** about the video content
- **Creating quizzes** to test your understanding
- **Making flashcards** for effective study

**Pro tip:** When you ask me something about the video you're watching, I'll take you directly to the exact moment where that topic is explained!

Select a video from the library to get started.`;

/**
 * VideoLibraryWidget
 * A clickable widget that shows video count and opens the video library panel
 */
const VideoLibraryWidget = memo(function VideoLibraryWidgetInner({
  videos,
  onOpenPanel,
}: {
  videos: VideoMetadata[];
  onOpenPanel: () => void;
}) {
  if (videos.length === 0) {
    return null;
  }

  const totalDuration = videos.reduce((acc, v) => acc + v.duration, 0);

  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 p-4 text-left",
        "rounded-2xl border border-hf-deep-blue/10 bg-white/80 backdrop-blur-sm",
        "shadow-sm transition-all hover:bg-white hover:shadow-md"
      )}
      onClick={onOpenPanel}
      type="button"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-hf-cyan/20 to-hf-cyan-light/20 text-hf-cyan">
        <Video className="size-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-hf-deep-blue text-sm">
          Video del Corso
        </h3>
        <p className="text-hf-deep-blue/60 text-xs">
          Click to open the video library
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-hf-cyan">
          <Play className="size-3" />
          {videos.length} video
        </span>
        <span className="text-hf-deep-blue/40">
          {formatDuration(totalDuration)} total
        </span>
      </div>
    </button>
  );
});

/**
 * WelcomeMessage Component
 *
 * Displays an initial welcome message from the assistant with:
 * 1. Welcome text explaining capabilities
 * 2. Video library widget that auto-opens the video panel
 */
function PureWelcomeMessage({ className }: { className?: string }) {
  const { openTab } = useCanvasTabs();
  const widgetRef = useRef<HTMLDivElement>(null);

  // Video fetching state
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've auto-opened the panel
  const hasAutoOpenedRef = useRef(false);

  // Fetch videos on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchVideos() {
      try {
        const response = await fetch("/api/videos");
        const data: VideosResponse = await response.json();

        if (cancelled) {
          return;
        }

        if (data.success && data.videos) {
          setVideos(data.videos);
        } else {
          setError(data.error || "Failed to load videos");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to fetch videos");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  // Open the video library panel
  const handleOpenPanel = useCallback(() => {
    if (videos.length === 0) {
      return;
    }

    const boundingBox = widgetRef.current?.getBoundingClientRect() ?? {
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
  }, [videos, openTab]);

  // Auto-open the video library panel when videos are loaded
  useEffect(() => {
    if (videos.length > 0 && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      handleOpenPanel();
    }
  }, [videos, handleOpenPanel]);

  // Animated memo.gif avatar
  const avatar = (
    <Image
      alt="H-FARM Assistant"
      className="object-contain"
      height={60}
      src="/images/memo.gif"
      unoptimized
      width={60}
    />
  );

  return (
    <ChatMessage className={cn("min-h-6", className)} from="assistant">
      {/* Animated avatar */}
      <div className="flex shrink-0 items-end pb-9">
        <ChatMessageAvatar className="size-14 rounded-none border-0 bg-transparent shadow-none ring-0">
          {avatar}
        </ChatMessageAvatar>
      </div>
      <ChatMessageBody className="grow md:gap-4">
        {/* Welcome message text in bubble */}
        <ChatMessageBubble variant="assistant">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-li:text-hf-deep-blue prose-p:text-hf-deep-blue prose-strong:text-hf-deep-blue">
            <MessageResponse>{WELCOME_MESSAGE_TEXT}</MessageResponse>
          </div>
        </ChatMessageBubble>

        {/* Video library widget */}
        <div className="mt-2" ref={widgetRef}>
          {isLoading ? (
            <div className="rounded-2xl border border-hf-deep-blue/10 bg-white/80 p-4 text-hf-deep-blue/60 text-sm">
              Loading videos...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          ) : (
            <VideoLibraryWidget onOpenPanel={handleOpenPanel} videos={videos} />
          )}
        </div>
      </ChatMessageBody>
    </ChatMessage>
  );
}

/**
 * Memoized WelcomeMessage component
 */
export const WelcomeMessage = memo(PureWelcomeMessage);
