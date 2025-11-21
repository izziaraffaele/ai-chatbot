"use client";

import { Fragment } from "react";
import { useChatContext, useChatMessages } from "@/components/chat/context";
import { useChatVotes } from "@/hooks/use-chat-votes";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";

/**
 * Props passed to MessageIterator render function
 */
export type MessageIteratorRenderProps = {
  message: ChatMessage;
  sender: {
    displayName?: string;
    avatar?: React.ReactNode;
  } | null;
  vote: Vote | undefined;
  isLastMessage: boolean;
  isStreaming: boolean;
  onVote: (value: "up" | "down", notes?: string) => Promise<void> | void;
};

/**
 * Iterates through chat messages and provides render props for each message.
 * Handles voting, streaming state, and empty state display.
 *
 * @example
 * <MessageIterator empty={<ChatThreadEmpty />}>
 *   {({ message, isLastMessage, vote, onVote }) => (
 *     <AssistantMessage
 *       message={message}
 *       isLastMessage={isLastMessage}
 *       vote={vote}
 *       onVoteAction={onVote}
 *     />
 *   )}
 * </MessageIterator>
 */
export type MessageIteratorProps = {
  empty?: React.ReactNode;
  displayUser?: { displayName?: string; avatar?: React.ReactNode };
  displayAssistant?: { displayName?: string; avatar?: React.ReactNode };
  children: (props: MessageIteratorRenderProps) => React.ReactNode;
};

/**
 * Headless component that handles message iteration logic.
 * Doesn't render any UI - delegates to children render prop.
 */
export function MessageIterator({
  empty = null,
  children: renderMessage,
  displayUser,
  displayAssistant,
}: MessageIteratorProps) {
  const { chatId, status } = useChatContext();
  const { messages } = useChatMessages();
  const { value: votes, voteMessage } = useChatVotes({ chatId });

  const senders: Record<
    string,
    { displayName?: string; avatar?: React.ReactNode } | undefined
  > = { user: displayUser, assistant: displayAssistant };

  // Show empty state if no messages
  if (messages.length === 0) {
    return <>{empty}</>;
  }

  // Render messages
  return (
    <>
      {messages.map((message, index) => {
        const messageSender = senders[message.role];
        const messageVote = votes.find((vote) => vote.messageId === message.id);
        const isLastMessage = index === messages.length - 1;

        return (
          <Fragment key={message.id}>
            {renderMessage({
              message,
              isLastMessage,
              isStreaming: status === "streaming" && isLastMessage,
              vote: messageVote,
              onVote: (value, notes) => voteMessage(message.id, value, notes),
              sender: messageSender || null,
            })}
          </Fragment>
        );
      })}
    </>
  );
}

// ============================================================================
// Message Part Iterator
// ============================================================================

export type MessagePartIteratorRenderProps = {
  part: ChatMessage["parts"][number];
  isLastPart: boolean;
  isStreaming: boolean;
};

export type MessagePartIteratorProps = {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
  children: (props: MessagePartIteratorRenderProps) => React.ReactNode;
};

/**
 * Headless component that handles message parts iteration logic.
 * Doesn't render any UI - delegates to children render prop.
 */
export function MessagePartIterator({
  message,
  isLastMessage,
  isStreaming: isMessageStreaming,
  children: renderPart,
}: MessagePartIteratorProps) {
  const lastPartIndex = message.parts.length - 1;

  return (
    <>
      {message.parts.map((part, index) => {
        const isLastPart = lastPartIndex === index;
        const isStreaming = isMessageStreaming && isLastMessage && isLastPart;

        return (
          <Fragment key={`${message.id}-part-${index}`}>
            {renderPart({
              part,
              isLastPart,
              isStreaming,
            })}
          </Fragment>
        );
      })}
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Helper to get file parts from message
 */
export function getMessageFileParts(message: ChatMessage) {
  return message.parts.filter((p) => p.type === "file");
}

/**
 * Helper to check if message has attachments
 */
export function getMessageHasAttachments(message: ChatMessage) {
  return message.parts.some((p) => p.type === "file");
}
