"use client";

import {
  ArrowLeft,
  Clock,
  LayoutGrid,
  List,
  Play,
  Search,
  Video,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  ChatArtifact,
  ChatArtifactBody,
  ChatArtifactHeader,
} from "@/components/chat/artifact";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Video metadata from the listVideos tool
 */
export type VideoMetadata = {
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
 * View mode for the artifact
 */
type ViewMode = "grid" | "player";

// ============================================================================
// CONSTANTS
// ============================================================================

export const VIDEO_LIBRARY_KIND = "video-library" as const;

export type VideoLibraryArtifactKind = typeof VIDEO_LIBRARY_KIND;

export const isVideoLibraryArtifact = (
  kind: string
): kind is VideoLibraryArtifactKind => kind === VIDEO_LIBRARY_KIND;

export type VideoLibraryUIArtifact = {
  title: string;
  documentId: string;
  kind: VideoLibraryArtifactKind;
  content: VideoMetadata[];
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get a nice lesson label from week and lesson
 */
function getLessonLabel(video: VideoMetadata): string {
  if (video.week && video.lesson) {
    return `${video.week} ${video.lesson}`;
  }
  if (video.week) {
    return video.week;
  }
  return "";
}

// ============================================================================
// COMPONENTS
// ============================================================================

export type VideoLibraryArtifactProps = {
  className?: string;
};

/**
 * VideoLibraryArtifact
 * Displays available videos in a card grid with search functionality.
 * When a video is clicked, switches to a player view.
 */
export function VideoLibraryArtifact({ className }: VideoLibraryArtifactProps) {
  const { activeTab, closeTab } = useCanvasTabs();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [listStyle, setListStyle] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected video for player view
  const [selectedVideo, setSelectedVideo] = useState<VideoMetadata | null>(
    null
  );

  // Get videos from active tab artifact content
  const videos = useMemo(() => {
    const content = activeTab?.artifact.content;
    if (!content || !Array.isArray(content)) {
      return [];
    }
    return content as VideoMetadata[];
  }, [activeTab?.artifact.content]);

  // Filter videos by search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery) {
      return videos;
    }
    const query = searchQuery.toLowerCase();
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.week?.toLowerCase().includes(query) ||
        v.lesson?.toLowerCase().includes(query)
    );
  }, [videos, searchQuery]);

  // Calculate total duration
  const totalDuration = useMemo(
    () => videos.reduce((acc, v) => acc + v.duration, 0),
    [videos]
  );

  // Handle close - closes the current tab
  const handleClose = useCallback(() => {
    if (activeTab) {
      closeTab(activeTab.id);
    }
  }, [activeTab, closeTab]);

  // Handle video selection - switches to player view
  const handleVideoSelect = useCallback((video: VideoMetadata) => {
    setSelectedVideo(video);
    setViewMode("player");
  }, []);

  // Handle back to grid
  const handleBackToGrid = useCallback(() => {
    setViewMode("grid");
    setSelectedVideo(null);
  }, []);

  // Render player view
  if (viewMode === "player" && selectedVideo) {
    return (
      <VideoPlayerView
        className={className}
        onBack={handleBackToGrid}
        onClose={handleClose}
        video={selectedVideo}
      />
    );
  }

  // Render grid view
  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      <ChatArtifactHeader
        actions={
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <Play className="size-4" />
              <span className="font-medium">{videos.length} video</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-4" />
              <span className="font-medium">{formatDuration(totalDuration)}</span>
            </div>
          </div>
        }
        onClose={handleClose}
        subtitle="Seleziona un video per riprodurlo"
        title={activeTab?.title || "Libreria Video"}
      />

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Search and View Toggle */}
          <div className="flex flex-col gap-3 border-border border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca video..."
                value={searchQuery}
              />
            </div>

            {/* View Toggle */}
            <div className="flex rounded-md border border-input">
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-l-md transition-colors",
                  listStyle === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setListStyle("grid")}
                title="Vista griglia"
                type="button"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-r-md border-input border-l transition-colors",
                  listStyle === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setListStyle("list")}
                title="Vista lista"
                type="button"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {/* Video Grid/List */}
          <div
            className={cn(
              "flex-1 overflow-y-auto p-4",
              listStyle === "grid"
                ? "grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-2"
            )}
          >
            {filteredVideos.map((video) => {
              const lessonLabel = getLessonLabel(video);

              if (listStyle === "list") {
                return (
                  <button
                    className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-accent/50 hover:shadow-sm"
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    type="button"
                  >
                    {/* Video Icon/Thumbnail */}
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400">
                      <Video className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {lessonLabel && (
                          <Badge
                            className="bg-red-50 text-red-700 text-xs dark:bg-red-950 dark:text-red-300"
                            variant="outline"
                          >
                            {lessonLabel}
                          </Badge>
                        )}
                        <p className="truncate font-medium text-sm">
                          {video.title}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">
                        {video.description}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0 bg-muted text-muted-foreground"
                      variant="outline"
                    >
                      {formatDuration(video.duration)}
                    </Badge>
                  </button>
                );
              }

              return (
                <button
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:bg-accent/50 hover:shadow-md"
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  type="button"
                >
                  {/* Video Thumbnail/Placeholder */}
                  <div className="relative aspect-video w-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110 dark:bg-black/80">
                        <Play className="size-6 text-red-500" />
                      </div>
                    </div>
                    {/* Duration Badge */}
                    <div className="absolute right-2 bottom-2">
                      <Badge className="bg-black/70 text-white text-xs dark:bg-white/80 dark:text-black">
                        {formatDuration(video.duration)}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex items-start gap-2">
                      {lessonLabel && (
                        <Badge
                          className="shrink-0 bg-red-50 text-red-700 text-xs dark:bg-red-950 dark:text-red-300"
                          variant="outline"
                        >
                          {lessonLabel}
                        </Badge>
                      )}
                      <h3 className="line-clamp-2 font-semibold text-sm leading-tight">
                        {video.title}
                      </h3>
                    </div>
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {video.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty filtered state */}
          {filteredVideos.length === 0 && videos.length > 0 && (
            <div className="px-6 pb-6 text-center text-muted-foreground text-sm">
              Nessun video trovato con i filtri applicati
            </div>
          )}

          {/* Empty state */}
          {videos.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Video className="size-12 opacity-50" />
              <p className="text-sm">Nessun video disponibile</p>
            </div>
          )}
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

// ============================================================================
// VIDEO PLAYER VIEW
// ============================================================================

type VideoPlayerViewProps = {
  className?: string;
  video: VideoMetadata;
  onBack: () => void;
  onClose: () => void;
};

function VideoPlayerView({
  className,
  video,
  onBack,
  onClose,
}: VideoPlayerViewProps) {
  const lessonLabel = getLessonLabel(video);

  return (
    <ChatArtifact className={cn("h-full rounded-none border-none", className)}>
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 border-border border-b px-4 py-3">
        <Button className="gap-2" onClick={onBack} size="sm" variant="ghost">
          <ArrowLeft className="size-4" />
          Indietro
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">{video.title}</h2>
          {lessonLabel && (
            <p className="text-muted-foreground text-xs">{lessonLabel}</p>
          )}
        </div>
        <Badge className="bg-muted text-muted-foreground" variant="outline">
          {formatDuration(video.duration)}
        </Badge>
        <Button className="size-8" onClick={onClose} size="icon" variant="ghost">
          <XCircle className="size-4" />
        </Button>
      </div>

      <ChatArtifactBody>
        <div className="flex h-full flex-col">
          {/* Video Player */}
          <div className="relative aspect-video w-full bg-black">
            <video
              className="size-full"
              controls
              poster={video.thumbnailUrl}
              src={video.videoUrl}
            >
              <track kind="captions" />
              Il tuo browser non supporta la riproduzione video.
            </video>
          </div>

          {/* Video Info */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  {lessonLabel && (
                    <Badge
                      className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      variant="outline"
                    >
                      {lessonLabel}
                    </Badge>
                  )}
                  <h1 className="font-bold text-xl">{video.title}</h1>
                </div>
                <p className="mt-2 text-muted-foreground">{video.description}</p>
              </div>

              {/* Video Details */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    Durata
                  </p>
                  <p className="font-medium">{formatDuration(video.duration)}</p>
                </div>
                {video.week && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Settimana
                    </p>
                    <p className="font-medium">{video.week}</p>
                  </div>
                )}
                {video.lesson && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase">
                      Lezione
                    </p>
                    <p className="font-medium">{video.lesson}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ChatArtifactBody>
    </ChatArtifact>
  );
}

