import { useChatUsage } from "@/hooks/use-chat-usage";
import { useChatRuntime } from "./chat";
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
} from "./elements/context";

const DEFAULT_MAX_TOKEN = Number.parseInt(
  process.env.CHAT_DEFAULT_MAX_TOKEN ||
    process.env.NEXT_PUBLIC_CHAT_DEFAULT_MAX_TOKEN ||
    "128_000",
  10
);

export function ChatContextUsage({
  maxTokens = DEFAULT_MAX_TOKEN,
  usedTokens,
  ...others
}: React.ComponentProps<"div"> & { maxTokens?: number; usedTokens?: number }) {
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
