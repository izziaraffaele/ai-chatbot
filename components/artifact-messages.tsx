"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { SparklesIcon } from "lucide-react";
import { memo } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import {
  ChatMessageActions,
  ChatMessageAvatar,
  ChatMessage as ChatMessageComponent,
  ChatMessageContent,
  ChatMessageParts,
} from "./chat-message";
import { Conversation, ConversationContent } from "./elements/conversation";

type ArtifactMessagesProps = {
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  messages: ChatMessage[];
  isReadonly: boolean;
  displayUser?: { displayName?: string; avatar?: React.ReactNode };
  displayAssistant?: { displayName?: string; avatar?: React.ReactNode };
};

function PureArtifactMessages({
  status,
  votes,
  messages,
  isReadonly,
  displayUser,
  displayAssistant,
}: ArtifactMessagesProps) {
  return (
    <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
      <ConversationContent className="flex h-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1;
          const isStreaming = status === "streaming" && isLastMessage;
          const vote = votes?.find((v) => v.messageId === message.id);
          const isAssistant = message.role === "assistant";
          const messageSender = isAssistant ? displayAssistant : displayUser;

          return (
            <ChatMessageComponent
              asChild
              from={message.role}
              isReadonly={isReadonly}
              isStreaming={isStreaming}
              key={message.id}
            >
              {messageSender?.avatar && (
                <ChatMessageAvatar>
                  <SparklesIcon className="size-4" />
                </ChatMessageAvatar>
              )}
              <ChatMessageContent className={isAssistant ? "gap-2" : undefined}>
                <ChatMessageParts
                  isLastMessage={isLastMessage}
                  isReadonly={isReadonly}
                  isStreaming={isStreaming}
                  message={message}
                />
                {!isReadonly && (
                  <ChatMessageActions
                    isReadonly={isReadonly}
                    message={message}
                    vote={vote}
                  />
                )}
              </ChatMessageContent>
            </ChatMessageComponent>
          );
        })}
      </ConversationContent>
    </Conversation>
  );
}

function areEqual(
  prevProps: ArtifactMessagesProps,
  nextProps: ArtifactMessagesProps
) {
  // Re-render if status changed
  if (prevProps.status !== nextProps.status) {
    return false;
  }

  // Re-render if message count changed
  if (prevProps.messages.length !== nextProps.messages.length) {
    return false;
  }

  // Re-render if votes changed
  if (JSON.stringify(prevProps.votes) !== JSON.stringify(nextProps.votes)) {
    return false;
  }

  return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
