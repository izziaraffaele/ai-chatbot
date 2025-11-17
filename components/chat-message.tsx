import { isToolUIPart, type ReasoningUIPart, type TextUIPart } from "ai";
import { motion } from "framer-motion";
import { CopyIcon, PencilIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { Vote } from "@/lib/db/schema";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import type { ChatThreadMessageProps } from "./chat-thread";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "./elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./elements/reasoning";
import { SparklesIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { ToolUIRouter } from "./tool-ui-router";

type ChatMessageMode = "view" | "edit";

export const ChatMessage = ({
  from,
  mode = "view",
  isStreaming,
  isReadonly,
  children,
  className,
  ...others
}: React.ComponentProps<typeof Message> & {
  mode?: ChatMessageMode;
  isReadonly?: boolean;
  isStreaming?: boolean;
}) => (
  <Message
    asChild
    className={cn(
      "flex-row gap-2 md:gap-3",
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

export const ChatMessageContent = ({
  className,
  ...others
}: React.ComponentProps<"div">) => (
  <div
    className={cn("flex flex-col gap-2", className)}
    data-slot="chat-message-content"
    {...others}
  />
);

export const ChatMessageReasoning = ({
  isStreamingPart,
  part,
}: {
  part: ReasoningUIPart;
  isStreamingPart?: boolean;
}) => {
  const isStreaming = isStreamingPart === true || part.state === "streaming";
  const reasoningText = part.text.trim();

  if (!reasoningText.length) {
    return null;
  }

  return (
    <Reasoning
      className="w-full"
      data-slot="chat-message-reasoning"
      isStreaming={isStreaming}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoningText}</ReasoningContent>
    </Reasoning>
  );
};

export const ChatMessageText = ({
  part,
  mode = "view",
}: {
  part: TextUIPart;
  mode?: ChatMessageMode;
}) => {
  const reasoningText = part.text.trim();

  if (!reasoningText.length) {
    return null;
  }

  if (mode === "edit") {
    return null;
  }

  return (
    <MessageContent
      className={cn(
        "group-[.is-user]:wrap-break-words group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-3! group-[.is-user]:py-2! group-[.is-user]:text-primary-foreground"
      )}
      data-slot="chat-message-text"
    >
      <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
    </MessageContent>
  );
};

const isTextPart = (
  part: ChatMessageType["parts"][number]
): part is TextUIPart => {
  return part.type === "text";
};

export const ChatMessageActions = ({
  onModeChange,
  onVote,
  isReadonly,
  message,
  vote,
  className,
  ...others
}: React.ComponentProps<typeof MessageActions> & {
  onModeChange?: (mode: ChatMessageMode) => void;
  onVote?: (vote: "up" | "down") => void;
  isReadonly?: boolean;
  message: ChatMessageType;
  vote?: Vote;
}) => {
  const t = useTranslations();
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
      {!isReadonly && (
        <MessageAction
          onClick={() => onModeChange?.("edit")}
          tooltip={t("message.actions.edit", "Edit")}
        >
          <PencilIcon className="size-3" />
        </MessageAction>
      )}
      <MessageAction
        onClick={handleCopy}
        tooltip={t("message.actions.copy", "Copy")}
      >
        <CopyIcon className="size-3" />
      </MessageAction>
      {message.role === "assistant" && (
        <MessageAction
          disabled={vote?.isUpvoted}
          onClick={() => onVote?.("up")}
          tooltip={t("message.actions.tooltipUpvote", "Upvote Response")}
        >
          <ThumbUpIcon />
        </MessageAction>
      )}
      {message.role === "assistant" && (
        <MessageAction
          disabled={vote?.isUpvoted === false}
          onClick={() => onVote?.("down")}
          tooltip={t("message.actions.tooltipDownvote", "Downvote Response")}
        >
          <ThumbDownIcon />
        </MessageAction>
      )}
    </MessageActions>
  );
};

export const ChatMessageParts = ({
  message,
  mode = "view",
  isLastMessage,
  isStreaming,
  isReadonly,
}: {
  message: ChatMessageType;
  mode?: ChatMessageMode;
  isLastMessage?: boolean;
  isStreaming?: boolean;
  isReadonly?: boolean;
}) => {
  const lastPartIndex = message.parts.length - 1;

  const fileParts = message.parts.filter((p) => p.type === "file");

  const hasAttachments = fileParts.length > 0;

  return (
    <>
      {/* Attachments (usually visible only in user message) */}
      {hasAttachments && (
        <MessageAttachments className="mb-2">
          {fileParts.map((part) => (
            <MessageAttachment data={part} key={part.url} />
          ))}
        </MessageAttachments>
      )}

      {message.parts?.map((part, index) => {
        const { type } = part;
        const isLastPart = lastPartIndex === index;
        const isStreamingPart = isStreaming && isLastMessage && isLastPart;

        const key = `message-${message.id}-part-${index}`;

        switch (type) {
          case "reasoning":
            return (
              <ChatMessageReasoning
                isStreamingPart={isStreamingPart}
                key={key}
                part={part}
              />
            );

          case "text":
            return (
              <ChatMessageText
                key={key}
                mode={isReadonly ? "view" : mode}
                part={part}
              />
            );

          default:
            // Tool UI rendering - delegate to ToolUIRouter for consistent handling
            if (isToolUIPart(part)) {
              return (
                <ToolUIRouter
                  isReadonly={isReadonly}
                  key={part.toolCallId}
                  part={part}
                />
              );
            }
            break;
        }

        // skip render unknown parts
        return null;
      })}
    </>
  );
};

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

export const DefaultChatMessage = ({
  message,
  sender,
  vote,
  isReadonly = true,
  isStreaming,
  isLastMessage,
  onVote,
  className,
}: ChatThreadMessageProps & {
  isReadonly?: boolean;
  isLastMessage?: boolean;
}) => {
  const [mode, setMode] = useState<ChatMessageMode>("view");

  const isAssistant = message.role === "assistant";

  const avatar = sender?.avatar || (isAssistant ? <SparklesIcon /> : null);

  const hasText = message.parts?.some(
    (p) => p.type === "text" && p.text?.trim()
  );

  return (
    <ChatMessage className={className} from={message.role}>
      {avatar && (
        <div className="flex shrink-0 items-end pb-9">
          <ChatMessageAvatar className="text-[#FFBE2C]">
            {avatar}
          </ChatMessageAvatar>
        </div>
      )}
      <ChatMessageContent
        className={cn("grow", {
          "md:gap-4": hasText,
        })}
      >
        <ChatMessageParts
          isLastMessage={isLastMessage}
          isReadonly={isReadonly}
          isStreaming={isStreaming}
          message={message}
          mode={mode}
        />
        <ChatMessageActions
          isReadonly={isReadonly}
          message={message}
          onModeChange={setMode}
          onVote={onVote}
          vote={vote}
        />
      </ChatMessageContent>
    </ChatMessage>
  );
};
