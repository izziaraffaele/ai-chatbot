"use client";

import type { TextUIPart } from "ai";
import { motion } from "framer-motion";
import { CopyIcon, PencilIcon } from "lucide-react";
import { useCallback } from "react";
import {
  Message,
  MessageAction,
  MessageActions,
} from "@/components/elements/message";
import { ThumbDownIcon, ThumbUpIcon } from "@/components/icons";
import type { Vote } from "@/lib/db/schema";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ChatMessageMode = "view" | "edit";

// ============================================================================
// Message Container
// ============================================================================

export type ChatMessageProps = React.ComponentProps<typeof Message> & {
  mode?: ChatMessageMode;
  isReadonly?: boolean;
  isStreaming?: boolean;
};

export const ChatMessage = ({
  from,
  mode = "view",
  isStreaming,
  isReadonly,
  children,
  className,
  ...others
}: ChatMessageProps) => (
  <Message
    asChild
    className={cn(
      "flex-row gap-2 group/canvas:w-full md:gap-3",
      {
        "flex-row-reverse": from === "user",
      },
      className
    )}
    data-mode={isReadonly ? "readonly" : mode}
    data-role={from}
    data-slot="chat-message"
    data-state={isStreaming ? "streaming" : "idle"}
    from={from}
    {...others}
  >
    <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
      {children}
    </motion.div>
  </Message>
);

// ============================================================================
// Message Parts
// ============================================================================

export const ChatMessageAvatar = ({
  className,
  ...others
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-full border-current bg-border/20 ring-1 ring-border dark:bg-background",
      className
    )}
    data-slot="chat-message-avatar"
    {...others}
  />
);

export const ChatMessageBody = ({
  className,
  ...others
}: React.ComponentProps<"div">) => (
  <div
    className={cn("flex flex-col gap-2", className)}
    data-slot="chat-message-content"
    {...others}
  />
);

// ============================================================================
// Message Actions
// ============================================================================

const isTextPart = (
  part: ChatMessageType["parts"][number]
): part is TextUIPart => {
  return part.type === "text";
};

export type ChatMessageToolbarProps = React.ComponentProps<
  typeof MessageActions
> & {
  message: ChatMessageType;
  vote?: Vote;
  isReadonly?: boolean;
  onModeChange?: (mode: ChatMessageMode) => void;
  onVote?: (vote: "up" | "down") => void;
};

export const ChatMessageToolbar = ({
  message,
  vote,
  isReadonly,
  onModeChange,
  onVote,
  className,
  ...others
}: ChatMessageToolbarProps) => {
  const handleCopy = useCallback(() => {
    const messageText = message.parts
      .filter(isTextPart)
      .map((part) => part.text)
      .join("\n\n");

    navigator.clipboard.writeText(messageText);
  }, [message]);

  return (
    <MessageActions
      className={cn("group-[.is-user]:ml-auto", className)}
      data-slot="chat-message-actions"
      {...others}
    >
      {!isReadonly && onModeChange && (
        <ChatMessageAction.Edit onModeChange={onModeChange} />
      )}
      <ChatMessageAction.Copy onCopy={handleCopy} />
      {message.role === "assistant" && onVote && (
        <>
          <ChatMessageAction.Vote
            disabled={vote?.isUpvoted}
            onVote={onVote}
            value="up"
          />
          <ChatMessageAction.Vote
            disabled={vote?.isUpvoted === false}
            onVote={onVote}
            value="down"
          />
        </>
      )}
    </MessageActions>
  );
};

// ============================================================================
// Individual Actions
// ============================================================================

type ChatMessageActionEditProps = {
  onModeChange: (mode: ChatMessageMode) => void;
};

const ChatMessageActionEdit = ({
  onModeChange,
}: ChatMessageActionEditProps) => {
  const t = useTranslations();
  return (
    <MessageAction
      onClick={() => onModeChange("edit")}
      tooltip={t("message.actions.edit", "Edit")}
    >
      <PencilIcon className="size-3" />
    </MessageAction>
  );
};

type ChatMessageActionCopyProps = {
  onCopy: () => void;
};

const ChatMessageActionCopy = ({ onCopy }: ChatMessageActionCopyProps) => {
  const t = useTranslations();
  return (
    <MessageAction onClick={onCopy} tooltip={t("message.actions.copy", "Copy")}>
      <CopyIcon className="size-3" />
    </MessageAction>
  );
};

type ChatMessageActionVoteProps = {
  value: "up" | "down";
  disabled?: boolean;
  onVote: (value: "up" | "down") => void;
};

const ChatMessageActionVote = ({
  value,
  disabled,
  onVote,
}: ChatMessageActionVoteProps) => {
  const t = useTranslations();
  const isUpvote = value === "up";

  return (
    <MessageAction
      disabled={disabled}
      onClick={() => onVote(value)}
      tooltip={
        isUpvote
          ? t("message.actions.tooltipUpvote", "Upvote Response")
          : t("message.actions.tooltipDownvote", "Downvote Response")
      }
    >
      {isUpvote ? <ThumbUpIcon /> : <ThumbDownIcon />}
    </MessageAction>
  );
};

export const ChatMessageAction = {
  Edit: ChatMessageActionEdit,
  Copy: ChatMessageActionCopy,
  Vote: ChatMessageActionVote,
};

// ============================================================================
// Helpers
// ============================================================================

export function getMessageHasText(message: ChatMessageType) {
  return message.parts.some((p) => p.type === "text" && p.text?.trim());
}
