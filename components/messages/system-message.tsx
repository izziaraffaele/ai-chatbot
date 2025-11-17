"use client";

import { MessagePartIterator } from "@/components/chat/iterators";
import { ChatMessage, ChatMessageBody } from "@/components/chat/message";
import { ChatMessagePart } from "@/components/chat/message-parts";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

export type SystemMessageProps = {
  message: ChatMessageType & { role: "system" };
  isStreaming?: boolean;
  isLastMessage?: boolean;
  className?: string;
};

export function SystemMessage({
  message,
  isStreaming = false,
  isLastMessage = false,
  className,
}: SystemMessageProps) {
  return (
    <ChatMessage
      className={className}
      from={message.role}
      isReadonly
      isStreaming={isStreaming}
      mode="view"
    >
      <ChatMessageBody className="grow">
        {/* Message parts - system messages typically only show text */}
        <MessagePartIterator
          isLastMessage={isLastMessage}
          isStreaming={isStreaming}
          message={message}
        >
          {({ part }) => {
            switch (part.type) {
              case "text":
                return <ChatMessagePart.Text mode="view" part={part} />;

              default:
                // Skip rendering other parts for system messages
                return null;
            }
          }}
        </MessagePartIterator>
      </ChatMessageBody>
    </ChatMessage>
  );
}
