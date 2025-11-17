"use client";

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
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type UserMessageProps = {
  message: ChatMessageType;
  sender?: {
    displayName?: string;
    avatar?: React.ReactNode;
  } | null;
  isReadonly?: boolean;
  isLastMessage?: boolean;
  className?: string;
};

export function UserMessage({
  message,
  sender,
  isReadonly = true,
  isLastMessage = false,
  className,
}: UserMessageProps) {
  const [mode, setMode] = useState<ChatMessageMode>("view");

  const avatar = sender?.avatar || null;

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
      {avatar && (
        <div className="flex shrink-0 items-end pb-9">
          <ChatMessageAvatar>{avatar}</ChatMessageAvatar>
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
          isStreaming={false}
          message={message}
        >
          {({ part }) => {
            switch (part.type) {
              case "text":
                return (
                  <ChatMessagePart.Text
                    mode={isReadonly ? "view" : mode}
                    part={part}
                  />
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
