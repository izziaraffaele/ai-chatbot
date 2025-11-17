"use client";

import { motion } from "framer-motion";
import { ConversationEmptyState } from "@/components/elements/conversation";
import { cn } from "@/lib/utils";

export type ChatThreadEmptyProps = React.ComponentProps<"div"> & {
  primaryText?: React.ReactNode;
  secondaryText?: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  /**
   * Whether to use the new ConversationEmptyState primitive or the classic animated layout
   * @default "classic"
   */
  variant?: "classic" | "primitive";
};

/**
 * ChatThreadEmpty Component
 *
 * Empty state component for chat threads when no messages are present.
 * Supports both the classic animated layout and the new ConversationEmptyState primitive.
 *
 * @example
 * ```tsx
 * // Classic animated layout (default)
 * <ChatThreadEmpty
 *   primaryText="Start a conversation"
 *   secondaryText="Send a message to begin"
 * />
 *
 * // New primitive layout
 * <ChatThreadEmpty
 *   variant="primitive"
 *   title="No messages yet"
 *   description="Start a conversation to see messages here"
 *   icon={<MessageCircleIcon />}
 * />
 * ```
 */
export const ChatThreadEmpty = ({
  className,
  primaryText,
  secondaryText,
  title,
  description,
  icon,
  variant = "classic",
  ...others
}: ChatThreadEmptyProps) => {
  // Use the new primitive if variant is set to "primitive"
  if (variant === "primitive") {
    return (
      <ConversationEmptyState
        className={className}
        description={description}
        icon={icon}
        title={title}
        {...others}
      />
    );
  }

  // Default: Classic animated layout (preserving original design)
  return (
    <div
      className={cn(
        "mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8",
        className
      )}
      data-slot="chat-thread-empty"
      {...others}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        {primaryText}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        {secondaryText}
      </motion.div>
    </div>
  );
};
