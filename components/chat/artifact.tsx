"use client";

import { AnimatePresence } from "framer-motion";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebounceCallback } from "usehooks-ts";
import {
  Artifact,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/elements/artifact";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Generic UI artifact state for any artifact type
 */
export type UIArtifact<TKind = string, TContent = any> = {
  title: string;
  documentId: string;
  kind: TKind;
  content: TContent;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

export type ArtifactVersion<T = any> = {
  id: string;
  title: string;
  content: T;
  createdAt: Date;
  metadata?: Record<string, any>;
};

export type VersionMode = "edit" | "diff" | "view";

export type ArtifactDraftContextValue<T = any> = {
  // State
  content: T;
  originalContent: T;
  isDirty: boolean;
  isSaving: boolean;

  // Actions
  setContent: (content: T) => void;
  save: (immediate?: boolean) => Promise<void>;
  reset: () => void;
};

export type ArtifactVersionContextValue<T = any> = {
  // State
  currentIndex: number;
  currentVersion: ArtifactVersion<T> | null;
  versions: ArtifactVersion<T>[];
  isLatest: boolean;
  totalVersions: number;

  // Navigation
  navigateVersion: (type: "next" | "prev" | "latest" | number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;

  // Mode (optional - for artifacts that support edit/diff)
  mode: VersionMode;
  setMode: (mode: VersionMode) => void;
  toggleMode: () => void;
};

// ============================================================================
// Draft Context
// ============================================================================

const ArtifactDraftContext = createContext<
  ArtifactDraftContextValue | undefined
>(undefined);

export type ArtifactDraftProviderProps<T = any> = {
  initialContent: T;
  onSaveAction?: (content: T) => Promise<void> | void;
  debounceMs?: number;
  children: ReactNode;
};

/**
 * ArtifactDraftProvider
 * Provides draft state management with auto-save for any artifact type
 */
export function ArtifactDraftProvider<T = any>({
  initialContent,
  onSaveAction,
  debounceMs = 2000,
  children,
}: ArtifactDraftProviderProps<T>) {
  const [content, setContent] = useState<T>(initialContent);
  const [originalContent] = useState<T>(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstRender = useRef(true);

  // Debounced save callback
  const debouncedSave = useDebounceCallback(async (contentToSave: T) => {
    if (!onSaveAction) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.resolve(onSaveAction(contentToSave));
    } finally {
      setIsSaving(false);
    }
  }, debounceMs);

  // Auto-save on content change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only auto-save if content has changed
    if (content !== originalContent) {
      debouncedSave(content);
    }
  }, [content, originalContent, debouncedSave]);

  const save = useCallback(
    async (immediate = false) => {
      if (!onSaveAction) {
        return;
      }

      if (immediate) {
        setIsSaving(true);
        try {
          await Promise.resolve(onSaveAction(content));
        } finally {
          setIsSaving(false);
        }
      } else {
        debouncedSave(content);
      }
    },
    [content, onSaveAction, debouncedSave]
  );

  const reset = useCallback(() => {
    setContent(originalContent);
  }, [originalContent]);

  const value = useMemo<ArtifactDraftContextValue<T>>(
    () => ({
      content,
      originalContent,
      isDirty: content !== originalContent,
      isSaving,
      setContent,
      save,
      reset,
    }),
    [content, originalContent, isSaving, save, reset]
  );

  return (
    <ArtifactDraftContext.Provider value={value}>
      {children}
    </ArtifactDraftContext.Provider>
  );
}

/**
 * useArtifactDraft Hook
 * Access artifact draft state and controls
 */
export function useArtifactDraft<T = any>(): ArtifactDraftContextValue<T> {
  const context = useContext(ArtifactDraftContext);
  if (!context) {
    throw new Error(
      "useArtifactDraft must be used within ArtifactDraftProvider"
    );
  }
  return context as ArtifactDraftContextValue<T>;
}

// ============================================================================
// Version Context
// ============================================================================

const ArtifactVersionContext = createContext<
  ArtifactVersionContextValue | undefined
>(undefined);

export type ArtifactVersionProviderProps<T = any> = {
  versions: ArtifactVersion<T>[];
  initialIndex?: number;
  initialMode?: VersionMode;
  children: ReactNode;
};

/**
 * ArtifactVersionProvider
 * Provides versioning context for any artifact type
 */
export function ArtifactVersionProvider<T = any>({
  versions,
  initialIndex = -1,
  initialMode = "edit",
  children,
}: ArtifactVersionProviderProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex === -1 ? versions.length - 1 : initialIndex
  );
  const [mode, setMode] = useState<VersionMode>(initialMode);

  const value = useMemo<ArtifactVersionContextValue<T>>(() => {
    const totalVersions = versions.length;
    const safeIndex = Math.max(0, Math.min(currentIndex, totalVersions - 1));
    const currentVersion = versions[safeIndex] || null;
    const isLatest = safeIndex === totalVersions - 1;

    const navigateVersion = (type: "next" | "prev" | "latest" | number) => {
      if (type === "latest") {
        setCurrentIndex(totalVersions - 1);
        setMode("edit");
      } else if (type === "next") {
        setCurrentIndex((prev) => Math.min(prev + 1, totalVersions - 1));
      } else if (type === "prev") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (typeof type === "number") {
        setCurrentIndex(Math.max(0, Math.min(type, totalVersions - 1)));
      }
    };

    const toggleMode = () => {
      setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
    };

    return {
      currentIndex: safeIndex,
      currentVersion,
      versions,
      isLatest,
      totalVersions,
      navigateVersion,
      canGoNext: safeIndex < totalVersions - 1,
      canGoPrev: safeIndex > 0,
      mode,
      setMode,
      toggleMode,
    };
  }, [versions, currentIndex, mode]);

  return (
    <ArtifactVersionContext.Provider value={value}>
      {children}
    </ArtifactVersionContext.Provider>
  );
}

/**
 * useArtifactVersion Hook
 * Access artifact versioning state and controls
 */
export function useArtifactVersion<T = any>(): ArtifactVersionContextValue<T> {
  const context = useContext(ArtifactVersionContext);
  if (!context) {
    throw new Error(
      "useArtifactVersion must be used within ArtifactVersionProvider"
    );
  }
  return context as ArtifactVersionContextValue<T>;
}

// ============================================================================
// Display Primitives
// ============================================================================

/**
 * ChatArtifactHeader
 * Standard header with close button, title/subtitle, and actions
 */
export type ChatArtifactHeaderProps = React.ComponentProps<
  typeof ArtifactHeader
> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  actions?: ReactNode;
};

export function ChatArtifactHeader({
  title,
  subtitle,
  onClose,
  actions,
  className,
  children,
  ...others
}: ChatArtifactHeaderProps) {
  return (
    <ArtifactHeader className={className} {...others}>
      <div className="flex flex-row items-start gap-4">
        {onClose && <ArtifactClose onClick={onClose} />}
        {(title || subtitle) && (
          <div data-slot="chat-artifact-summary">
            {title && <ArtifactTitle>{title}</ArtifactTitle>}
            {subtitle && <ArtifactDescription>{subtitle}</ArtifactDescription>}
          </div>
        )}
        {children}
      </div>
      {actions}
    </ArtifactHeader>
  );
}

/**
 * ChatArtifactBody
 * Content wrapper with optional overlay toolbar
 */
export type ChatArtifactBodyProps = React.ComponentProps<
  typeof ArtifactContent
> & {
  toolbar?: ReactNode;
};

export function ChatArtifactBody({
  toolbar,
  className,
  children,
  ...others
}: ChatArtifactBodyProps) {
  return (
    <ArtifactContent
      className={cn(
        "h-full max-w-full! items-center overflow-y-scroll bg-background dark:bg-muted",
        className
      )}
      {...others}
    >
      {children}
      <AnimatePresence>{toolbar}</AnimatePresence>
    </ArtifactContent>
  );
}

/**
 * ChatArtifactFooter
 * Conditional footer for navigation/controls
 */
export type ChatArtifactFooterProps = {
  visible?: boolean;
  children: ReactNode;
};

export function ChatArtifactFooter({
  visible = true,
  children,
}: ChatArtifactFooterProps) {
  return <AnimatePresence>{visible && children}</AnimatePresence>;
}

/**
 * ChatArtifact
 * Root artifact container (re-exports from elements)
 */
export const ChatArtifact = Artifact;

// ============================================================================
// Action Primitives
// ============================================================================

export type ChatArtifactActionProps = React.ComponentProps<"button"> & {
  tooltip?: string;
  icon?: React.ReactNode;
  label?: string;
};

/**
 * Base action button for artifacts
 */
export function ChatArtifactActionButton({
  tooltip,
  icon,
  label,
  className,
  children,
  ...others
}: ChatArtifactActionProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      title={tooltip}
      type="button"
      {...others}
    >
      {icon}
      {label && <span className="text-sm">{label}</span>}
      {children}
    </button>
  );
}

/**
 * Version navigation actions
 */
function ChatArtifactActionPrevVersion({
  onClick,
  ...props
}: ChatArtifactActionProps) {
  const { navigateVersion, canGoPrev } = useArtifactVersion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      navigateVersion("prev");
      onClick?.(e);
    },
    [navigateVersion, onClick]
  );

  return (
    <ChatArtifactActionButton
      disabled={!canGoPrev}
      onClick={handleClick}
      {...props}
    />
  );
}

function ChatArtifactActionNextVersion({
  onClick,
  ...props
}: ChatArtifactActionProps) {
  const { navigateVersion, canGoNext } = useArtifactVersion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      navigateVersion("next");
      onClick?.(e);
    },
    [navigateVersion, onClick]
  );

  return (
    <ChatArtifactActionButton
      disabled={!canGoNext}
      onClick={handleClick}
      {...props}
    />
  );
}

function ChatArtifactActionLatestVersion({
  onClick,
  ...props
}: ChatArtifactActionProps) {
  const { navigateVersion, isLatest } = useArtifactVersion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      navigateVersion("latest");
      onClick?.(e);
    },
    [navigateVersion, onClick]
  );

  return (
    <ChatArtifactActionButton
      disabled={isLatest}
      onClick={handleClick}
      {...props}
    />
  );
}

/**
 * Mode toggle actions
 */
function ChatArtifactActionToggleMode({
  onClick,
  ...props
}: ChatArtifactActionProps) {
  const { toggleMode, mode } = useArtifactVersion();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      toggleMode();
      onClick?.(e);
    },
    [toggleMode, onClick]
  );

  return (
    <ChatArtifactActionButton
      onClick={handleClick}
      {...props}
      label={props.label || (mode === "edit" ? "Diff" : "Edit")}
    />
  );
}

/**
 * Common actions
 */
function ChatArtifactActionCopy({
  ...props
}: ChatArtifactActionProps & {
  content?: string;
}) {
  const { content: draftContent } = useArtifactDraft<string>();
  const contentToCopy = props.content ?? draftContent;

  const handleClick = useCallback(
    async (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (contentToCopy) {
        await navigator.clipboard.writeText(contentToCopy);
      }
    },
    [contentToCopy]
  );

  return <ChatArtifactActionButton onClick={handleClick} {...props} />;
}

function ChatArtifactActionDownload({
  filename = "artifact.txt",
  ...props
}: ChatArtifactActionProps & {
  filename?: string;
  content?: string;
}) {
  const { content: draftContent } = useArtifactDraft<string>();
  const contentToDownload = props.content ?? draftContent;

  const handleClick = useCallback(
    (_e: React.MouseEvent<HTMLButtonElement>) => {
      if (contentToDownload) {
        const blob = new Blob([contentToDownload], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [contentToDownload, filename]
  );

  return <ChatArtifactActionButton onClick={handleClick} {...props} />;
}

function ChatArtifactActionShare({
  onClick,
  ...props
}: ChatArtifactActionProps & {
  url?: string;
}) {
  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const shareUrl = props.url ?? window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({
            url: shareUrl,
          });
        } catch (error) {
          // User cancelled or share failed
          console.error("Share failed:", error);
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
      }

      onClick?.(e);
    },
    [props.url, onClick]
  );

  return <ChatArtifactActionButton onClick={handleClick} {...props} />;
}

/**
 * Namespace export for artifact actions
 */
export const ChatArtifactAction = {
  PrevVersion: ChatArtifactActionPrevVersion,
  NextVersion: ChatArtifactActionNextVersion,
  LatestVersion: ChatArtifactActionLatestVersion,
  ToggleMode: ChatArtifactActionToggleMode,
  Copy: ChatArtifactActionCopy,
  Download: ChatArtifactActionDownload,
  Share: ChatArtifactActionShare,
};
