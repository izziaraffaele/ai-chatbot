"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useChatContext } from "@/components/chat/context";
import type { ChatMessage } from "@/lib/types";

/**
 * ChatAutoResume
 * Side effect component that automatically resumes streaming
 * when the last message is from the user
 */
export type ChatAutoResumeProps = {
  /**
   * Initial messages to check for resumable state
   */
  initialMessages?: ChatMessage[];
  /**
   * Whether auto-resume is enabled
   * @default true
   */
  enabled?: boolean;
};

export function ChatAutoResume({
  initialMessages = [],
  enabled = true,
}: ChatAutoResumeProps) {
  const { chat } = useChatContext();

  // biome-ignore lint/correctness/useExhaustiveDependencies: suppress dependency chatConfig
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === "user") {
      chat.resumeStream();
    }

    // we intentionally control hook execution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, initialMessages.at, chat?.id]);

  return null;
}

/**
 * ChatRouteParamsHandler
 * Side effect component that handles URL query parameters
 * Automatically sends a message when ?query=... is present
 */
export function ChatRouteParamsHandler() {
  const { chat, sendMessage } = useChatContext();
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const hasAppendedQueryRef = useRef(false);

  const lastMessage = chat.messages.at(0);
  const shouldAppendQuery =
    !lastMessage ||
    (chat.messages.length === 1 && lastMessage.role === "assistant");

  // biome-ignore lint/correctness/useExhaustiveDependencies: suppress dependency chatConfig
  useEffect(() => {
    if (query && shouldAppendQuery && !hasAppendedQueryRef.current) {
      sendMessage({ text: query, files: [] });

      hasAppendedQueryRef.current = true;
      window.history.replaceState({}, "", `/chat/${chat.id}`);
    }
  }, [query, shouldAppendQuery, sendMessage]);

  return null;
}
