"use client";

import { useChat } from "@ai-sdk/react";
import { Fragment, useDeferredValue, useMemo } from "react";
import { useChatRuntime } from "@/components/chat/context";
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
  /**
   * Optional prefix to add to message keys to avoid duplicate key warnings
   * when the same messages are rendered in multiple places (e.g., main thread and canvas)
   */
  keyPrefix?: string;
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
  keyPrefix = "",
}: MessageIteratorProps) {
  const runtime = useChatRuntime();
  const { id: chatId, messages, status } = useChat({ chat: runtime.chat });
  const { value: votes, voteMessage } = useChatVotes({ chatId });

  // Defer messages to reduce priority of streaming updates
  // This allows React to skip intermediate states during rapid token delivery
  const deferredMessages = useDeferredValue(messages);

  // Memoize senders to prevent unnecessary re-renders of message components
  const senders = useMemo<
    Record<
      string,
      { displayName?: string; avatar?: React.ReactNode } | undefined
    >
  >(
    () => ({ user: displayUser, assistant: displayAssistant }),
    [displayUser, displayAssistant]
  );

  // Deduplicate messages by ID to prevent duplicate key errors
  // This handles cases where the AI SDK might provide duplicate messages during streaming
  // Use deferredMessages for rendering to allow batched updates
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return deferredMessages.filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [deferredMessages]);

  // Show empty state if no messages
  if (uniqueMessages.length === 0) {
    return <>{empty}</>;
  }

  // Build the key with optional prefix to avoid duplicates when rendered in multiple places
  const getMessageKey = (messageId: string) =>
    keyPrefix ? `${keyPrefix}-${messageId}` : messageId;

  // Render messages
  return (
    <>
      {uniqueMessages.map((message, index) => {
        const messageSender = senders[message.role];
        const messageVote = votes.find((vote) => vote.messageId === message.id);
        const isLastMessage = index === uniqueMessages.length - 1;

        return (
          <Fragment key={getMessageKey(message.id)}>
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
