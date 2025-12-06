"use client";

import equal from "fast-deep-equal";
import { memo, useState } from "react";
import { MessagePartIterator } from "@/components/chat/iterators";
import {
  ChatMessage,
  ChatMessageBody,
  ChatMessageBubble,
  type ChatMessageMode,
  ChatMessageToolbar,
} from "@/components/chat/message";
import { ChatMessagePart } from "@/components/chat/message-parts";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type UserMessageProps = {
  message: ChatMessageType;
  isReadonly?: boolean;
  isLastMessage?: boolean;
  className?: string;
};

function PureUserMessage({
  message,
  isReadonly = true,
  isLastMessage = false,
  className,
}: UserMessageProps) {
  const [mode, setMode] = useState<ChatMessageMode>("view");

  const hasText = message.parts?.some(
    (p) => p.type === "text" && p.text?.trim()
  );

  return (
    <ChatMessage
      className={className}
      from={message.role}
      isReadonly={isReadonly}
      isStreaming={false}
      mode={mode}
    >
      <ChatMessageBody
        className={cn("grow", {
          "md:gap-4": hasText,
        })}
      >
        {/* Attachments */}
        <ChatMessagePart.Attachments parts={message.parts} />

        {/* Message parts wrapped in user bubble */}
        <MessagePartIterator
          isLastMessage={isLastMessage}
          isStreaming={false}
          message={message}
        >
          {({ part }) => {
            switch (part.type) {
              case "text":
                return (
                  <ChatMessageBubble variant="user">
                    <ChatMessagePart.Text
                      mode={isReadonly ? "view" : mode}
                      part={part}
                    />
                  </ChatMessageBubble>
                );

              default:
                // Skip rendering other parts for user messages
                return null;
            }
          }}
        </MessagePartIterator>

        {/* Toolbar */}
        <ChatMessageToolbar
          isReadonly={isReadonly}
          message={message}
          onModeChange={setMode}
        />
      </ChatMessageBody>
    </ChatMessage>
  );
}

/**
 * Memoized UserMessage component to prevent unnecessary re-renders
 * during streaming updates. Uses deep equality for message comparison.
 */
export const UserMessage = memo(PureUserMessage, (prevProps, nextProps) => {
  return (
    equal(prevProps.message, nextProps.message) &&
    prevProps.isLastMessage === nextProps.isLastMessage &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
