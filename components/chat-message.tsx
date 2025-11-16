import { isToolUIPart, type ReasoningUIPart, type TextUIPart } from "ai";
import { motion } from "framer-motion";
import { CopyIcon, PencilIcon, SparklesIcon } from "lucide-react";
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
import { ThumbDownIcon, ThumbUpIcon } from "./icons";
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
      "flex-row",
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
        "group-[.is-user]:wrap-break-words group-[.is-user]:rounded-2xl group-[.is-user]:px-3! group-[.is-user]:py-2!"
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
    <MessageActions data-slot="chat-message-actions" {...others}>
      {!isReadonly && (
        <MessageAction label="Edit" onClick={() => onModeChange?.("edit")}>
          <PencilIcon className="size-3" />
        </MessageAction>
      )}
      <MessageAction label="Copy" onClick={handleCopy}>
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
      "flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border",
      className
    )}
    data-slot="chat-message-avatar"
    {...others}
  />
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

export const DefaultChatMessage = ({
  message,
  sender,
  vote,
  isReadonly = true,
  isStreaming,
  isLastMessage,
  onVote,
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
    <ChatMessage from={message.role}>
      {avatar && (
        <div className="flex shrink-0 items-end pb-7.5">
          <ChatMessageAvatar>{avatar}</ChatMessageAvatar>
        </div>
      )}
      <ChatMessageContent
        className={cn("grow", {
          "md:gap-4": hasText,
          "min-h-96": isAssistant && isLastMessage,
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
