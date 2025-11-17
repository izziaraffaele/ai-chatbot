"use client";

import { useChatRuntime } from "@/components/chat/context";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/elements/context";
import { useChatUsage } from "@/hooks/use-chat-usage";

const DEFAULT_MAX_TOKEN = Number.parseInt(
  process.env.CHAT_DEFAULT_MAX_TOKEN ||
    process.env.NEXT_PUBLIC_CHAT_DEFAULT_MAX_TOKEN ||
    "128_000",
  10
);

/**
 * ChatContextUsage
 * Displays token usage information for the chat
 * Shows input, output, reasoning, and cache usage
 */
export type ChatContextUsageProps = React.ComponentProps<"div"> & {
  maxTokens?: number;
  usedTokens?: number;
};

export function ChatContextUsage({
  maxTokens = DEFAULT_MAX_TOKEN,
  usedTokens,
  ...others
}: ChatContextUsageProps) {
  const { chat } = useChatRuntime();
  const { value: usage } = useChatUsage({ chatId: chat.id });

  return (
    <Context
      {...others}
      maxTokens={maxTokens}
      usage={usage}
      usedTokens={usedTokens || usage.totalTokens || 0}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
}
