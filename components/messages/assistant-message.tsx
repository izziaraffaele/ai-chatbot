"use client";

import { isToolUIPart } from "ai";
import equal from "fast-deep-equal";
import type React from "react";
import { memo, useState } from "react";
import { MessagePartIterator } from "@/components/chat/iterators";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageBody,
  type ChatMessageMode,
  ChatMessageToolbar,
} from "@/components/chat/message";
import { ChatMessagePart } from "@/components/chat/message-parts";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type ChatToolProps, getToolUI } from "../tools";

export type AssistantMessageProps = {
  message: ChatMessageType;
  sender?: {
    displayName?: string;
    avatar?: React.ReactNode;
  } | null;
  vote?: Vote;
  isReadonly?: boolean;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  showReasoning?: boolean;
  onVoteAction?: (value: "up" | "down", notes?: string) => Promise<void> | void;
  className?: string;
  fallbackTool?: React.ElementType<ChatToolProps>;
};

function PureAssistantMessage({
  message,
  sender,
  vote,
  isReadonly = true,
  isStreaming = false,
  isLastMessage = false,
  showReasoning = true,
  onVoteAction,
  className,
  fallbackTool,
}: AssistantMessageProps) {
  const [mode, setMode] = useState<ChatMessageMode>("view");

  const avatar = sender?.avatar || (
    <span className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-lg">
      🏢
    </span>
  );

  const hasText = message.parts?.some(
    (p) => p.type === "text" && p.text?.trim()
  );

  const isMessageStreaming = isStreaming && isLastMessage;
  return (
    <ChatMessage
      className={cn({ "min-h-6": isLastMessage }, className)}
      from={message.role}
      isReadonly={isReadonly}
      isStreaming={isMessageStreaming}
      mode={mode}
    >
      {avatar && (
        <div
          className={cn("flex shrink-0 items-end", {
            "pb-9": !isMessageStreaming && hasText,
          })}
        >
          <ChatMessageAvatar className="text-[#FFBE2C]">
            {avatar}
          </ChatMessageAvatar>
        </div>
      )}
      <ChatMessageBody
        className={cn("grow", {
          "md:gap-4": hasText,
        })}
      >
        {/* Attachments */}
        <ChatMessagePart.Attachments parts={message.parts} />

        {/* Message parts */}
        <MessagePartIterator
          isLastMessage={isLastMessage}
          isStreaming={isStreaming}
          message={message}
        >
          {({ part, isStreaming: isPartStreaming, isLastPart }) => {
            switch (part.type) {
              case "text":
                return (
                  <ChatMessagePart.Text
                    mode={isReadonly ? "view" : mode}
                    part={part}
                  />
                );

              case "reasoning":
                return showReasoning ? (
                  <ChatMessagePart.Reasoning
                    isStreaming={isPartStreaming}
                    part={part}
                  />
                ) : null;

              default:
                // Tool UI rendering - use inline renderTool function
                if (isToolUIPart(part)) {
                  const ToolComponent = getToolUI(part, fallbackTool);
                  return (
                    <ToolComponent
                      isLastPart={isLastPart}
                      isReadonly={isReadonly}
                      isStreaming={isStreaming}
                      part={part}
                    />
                  );
                }

                // Fallback for unsupported parts
                return null;
            }
          }}
        </MessagePartIterator>

        {/* Toolbar */}
        {!isMessageStreaming && hasText && (
          <ChatMessageToolbar
            isReadonly={isReadonly}
            message={message}
            onModeChange={setMode}
            onVote={onVoteAction}
            vote={vote}
          />
        )}
      </ChatMessageBody>
    </ChatMessage>
  );
}

/**
 * Memoized AssistantMessage component to prevent unnecessary re-renders
 * during streaming updates. Uses deep equality for message comparison.
 */
export const AssistantMessage = memo(
  PureAssistantMessage,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.message, nextProps.message) &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.isReadonly === nextProps.isReadonly &&
      prevProps.vote?.isUpvoted === nextProps.vote?.isUpvoted
    );
  }
);
