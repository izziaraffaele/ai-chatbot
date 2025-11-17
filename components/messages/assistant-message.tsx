"use client";

import { isToolUIPart } from "ai";
import { useState } from "react";
import { MessagePartIterator } from "@/components/chat/iterators";
import {
  ChatMessage,
  ChatMessageAvatar,
  ChatMessageBody,
  type ChatMessageMode,
  ChatMessageToolbar,
} from "@/components/chat/message";
import { ChatMessagePart } from "@/components/chat/message-parts";
import { SparklesIcon } from "@/components/icons";
import { ToolUIRouter } from "@/components/tool-ui-router";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

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
};

export function AssistantMessage({
  message,
  sender,
  vote,
  isReadonly = true,
  isStreaming = false,
  isLastMessage = false,
  showReasoning = true,
  onVoteAction,
  className,
}: AssistantMessageProps) {
  const [mode, setMode] = useState<ChatMessageMode>("view");

  const avatar = sender?.avatar || <SparklesIcon />;

  const hasText = message.parts?.some(
    (p) => p.type === "text" && p.text?.trim()
  );

  return (
    <ChatMessage
      className={className}
      from={message.role}
      isReadonly={isReadonly}
      isStreaming={isStreaming}
      mode={mode}
    >
      {avatar && (
        <div className="flex shrink-0 items-end pb-9">
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
          {({ part, isStreaming: isPartStreaming }) => {
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
                // Tool UI rendering - delegate to ToolUIRouter for custom tool UIs
                if (isToolUIPart(part)) {
                  return <ToolUIRouter isReadonly={isReadonly} part={part} />;
                }

                // Fallback for unsupported parts
                return null;
            }
          }}
        </MessagePartIterator>

        {/* Toolbar */}
        <ChatMessageToolbar
          isReadonly={isReadonly}
          message={message}
          onModeChange={setMode}
          onVote={onVoteAction}
          vote={vote}
        />
      </ChatMessageBody>
    </ChatMessage>
  );
}
