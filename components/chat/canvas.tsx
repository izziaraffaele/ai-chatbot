"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWindowSize } from "usehooks-ts";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * ChatCanvas Root Container
 * Full-screen overlay for split-view layout (thread + main panel)
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
  const { open: isSidebarOpen } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className={cn(
            "grpup/canvas fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent",
            className
          )}
          data-slot="chat-canvas"
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
          initial={{ opacity: 1 }}
          {...others}
        >
          {!isMobile && (
            <motion.div
              animate={{ width: windowWidth, right: 0 }}
              className="fixed h-dvh bg-background"
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}
          {children as React.ReactNode}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * ChatCanvasThread
 * 400px sidebar with slide-in animation
 * Shows messages alongside the main canvas content
 */
export type ChatCanvasThreadProps = React.ComponentProps<typeof motion.div> & {
  isCurrentVersion?: boolean;
};

export function ChatCanvasThread({
  isCurrentVersion = true,
  className,
  children,
  ...others
}: ChatCanvasThreadProps) {
  return (
    <motion.div
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
          delay: 0.1,
          type: "spring",
          stiffness: 300,
          damping: 30,
        },
      }}
      className={cn(
        "relative flex h-dvh w-[400px] min-w-0 shrink-0 flex-col overflow-hidden bg-muted dark:bg-background",
        className
      )}
      data-slot="chat-canvas-thread"
      exit={{
        opacity: 0,
        x: 0,
        scale: 1,
        transition: { duration: 0 },
      }}
      initial={{ opacity: 0, x: 10, scale: 1 }}
      {...others}
    >
      <AnimatePresence>
        {!isCurrentVersion && (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      {children as React.ReactNode}
    </motion.div>
  );
}

/**
 * ChatCanvasMain
 * Main panel with expanding animation from bounding box
 * Responsive width (full on mobile, minus thread on desktop)
 */
export type ChatCanvasMainProps = React.ComponentProps<typeof motion.div> & {
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

export function ChatCanvasMain({
  boundingBox,
  className,
  children,
  ...others
}: ChatCanvasMainProps) {
  const isMobile = useIsMobile();
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  return (
    <motion.div
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        height: windowHeight,
        width: windowWidth || "calc(100dvw)",
        borderRadius: 0,
        transition: {
          delay: 0,
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.8,
        },
        ...(!isMobile && {
          x: 400,
          width: windowWidth ? windowWidth - 400 : "calc(100dvw-400px)",
        }),
      }}
      className={cn(
        "fixed flex h-dvh max-w-full flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted",
        className
      )}
      data-slot="chat-canvas-main"
      exit={{
        opacity: 0,
        scale: 0.5,
        transition: {
          delay: 0.1,
          type: "spring",
          stiffness: 600,
          damping: 30,
        },
      }}
      initial={{
        opacity: 1,
        x: boundingBox.left,
        y: boundingBox.top,
        height: boundingBox.height,
        width: boundingBox.width,
        borderRadius: 50,
      }}
      {...others}
    >
      {children}
    </motion.div>
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
