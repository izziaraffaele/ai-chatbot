"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * ChatCanvas Root Container
 * Full-screen overlay for split-view layout (thread + main panel)
 * Now uses resizable panels for adjustable column widths
 */
export type ChatCanvasProps = React.ComponentProps<typeof motion.div> & {
  isVisible: boolean;
};

export function ChatCanvas({
  isVisible,
  className,
  children,
  ...others
}: ChatCanvasProps) {
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className={cn(
            "group/canvas fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-background",
            className
          )}
          data-slot="chat-canvas"
          exit={{ opacity: 0, transition: { delay: 0.2 } }}
          initial={{ opacity: 0 }}
          {...others}
        >
          {isMobile ? (
            // Mobile: Stack panels vertically, no resize
            <div className="flex h-full w-full flex-col">{children}</div>
          ) : (
            // Desktop: Resizable horizontal panels
            <PanelGroup
              autoSaveId="chat-canvas-panels"
              className="h-full w-full"
              direction="horizontal"
            >
              {children}
            </PanelGroup>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * ChatCanvasThread
 * Resizable left panel for chat messages
 * Default: 60% width, min: 30%, max: 80%
 */
export type ChatCanvasThreadProps = React.ComponentProps<"div"> & {
  isCurrentVersion?: boolean;
};

export function ChatCanvasThread({
  isCurrentVersion = true,
  className,
  children,
  ...others
}: ChatCanvasThreadProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: Full width, no resize
    return (
      <div
        className={cn(
          "relative flex h-dvh w-full flex-col overflow-hidden bg-muted dark:bg-background",
          className
        )}
        data-slot="chat-canvas-thread"
        {...others}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <Panel
        className={cn(
          "relative flex h-dvh min-w-0 flex-col overflow-hidden bg-muted dark:bg-background",
          className
        )}
        data-slot="chat-canvas-thread"
        defaultSize={60}
        maxSize={80}
        minSize={30}
        order={1}
      >
        <AnimatePresence>
          {!isCurrentVersion && (
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute top-0 left-0 z-50 size-full bg-zinc-900/50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        {children}
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="group relative flex w-2 items-center justify-center bg-border transition-colors hover:bg-primary/20 active:bg-primary/30">
        <div className="flex h-8 w-4 items-center justify-center rounded-sm bg-border group-hover:bg-primary/50 group-active:bg-primary">
          <GripVertical className="size-3 text-muted-foreground group-hover:text-primary-foreground" />
        </div>
      </PanelResizeHandle>
    </>
  );
}

/**
 * ChatCanvasMain
 * Resizable right panel for artifact display
 * Default: 40% width, min: 20%, max: 70%
 * Supports an optional tab bar slot for multi-tab functionality
 */
export type ChatCanvasMainProps = React.ComponentProps<"div"> & {
  boundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** Optional tab bar component rendered above the content */
  tabBar?: React.ReactNode;
};

export function ChatCanvasMain({
  boundingBox,
  tabBar,
  className,
  children,
  ...others
}: ChatCanvasMainProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile: Full width panel
    return (
      <div
        className={cn(
          "flex h-dvh w-full flex-col overflow-hidden bg-background dark:bg-muted",
          className
        )}
        data-slot="chat-canvas-main"
        {...others}
      >
        {tabBar}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    );
  }

  return (
    <Panel
      className={cn(
        "flex h-dvh min-w-0 flex-col overflow-hidden border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted",
        className
      )}
      data-slot="chat-canvas-main"
      defaultSize={40}
      maxSize={70}
      minSize={20}
      order={2}
      {...others}
    >
      {tabBar}
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        exit={{ opacity: 0, scale: 0.98 }}
        initial={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </Panel>
  );
}

/**
 * ChatCanvasComposer
 * Bottom sticky input area for canvas thread
 */
export type ChatCanvasComposerProps = React.ComponentProps<"div">;

export function ChatCanvasComposer({
  className,
  children,
  ...others
}: ChatCanvasComposerProps) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-row items-end gap-2 px-4 pb-4",
        className
      )}
      data-slot="chat-canvas-composer"
      {...others}
    >
      {children}
    </div>
  );
}
