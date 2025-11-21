"use client";

import type { DataUIPart } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextIcon,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/elements/context";
import type { ChatDataTypes } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { useDataStreamSubscription } from "./streaming";

const DEFAULT_MAX_TOKEN = Number.parseInt(
  process.env.CHAT_DEFAULT_MAX_TOKEN ||
    process.env.NEXT_PUBLIC_CHAT_DEFAULT_MAX_TOKEN ||
    "128000",
  10
);

export const ChatUsageContext = createContext<{
  usage: AppUsage;
  maxTokens: number;
  usedTokens: number;
  setUsage: (value: AppUsage) => void;
  setUsedTokens: (value: number) => void;
}>({
  maxTokens: DEFAULT_MAX_TOKEN,
  usedTokens: 0,
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  },
  setUsedTokens: () => {
    return;
  },
  setUsage: () => {
    return;
  },
});

export function useChatUsageContext() {
  return useContext(ChatUsageContext);
}

export function useChatUsage() {
  return useContext(ChatUsageContext).usage;
}

export function ChatUsageProvider({
  children,
  initialUsage,
}: React.PropsWithChildren<{ initialUsage?: AppUsage }>) {
  const [usage, setUsage] = useState<AppUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    ...initialUsage,
  });

  const [usedTokens, setUsedTokens] = useState(0);

  useDataStreamSubscription(
    (part) => part.type === "data-usage",
    (part) => {
      console.log(part);
      if (part.type === "data-usage") {
        setUsage(part.data);
      }
    }
  );

  const handleDataUsageStream = useCallback(
    (part: DataUIPart<ChatDataTypes>) => {
      if (part.type === "data-usage") {
        setUsage(part.data);
      }
    },
    []
  );

  // Subscribe to artifact-related stream parts
  const filter = useCallback(
    (part: DataUIPart<ChatDataTypes>) => part.type === "data-usage",
    []
  );

  useDataStreamSubscription(filter, handleDataUsageStream);

  const contextValue = useMemo(() => {
    const { inputTokens = 0, outputTokens = 0 } = usage;
    return {
      usage,
      maxTokens: DEFAULT_MAX_TOKEN,
      usedTokens:
        usedTokens || (usage.inputTokens && inputTokens + outputTokens) || 0,
      setUsage,
      setUsedTokens,
    };
  }, [usage, usedTokens]);

  return (
    <ChatUsageContext.Provider value={contextValue}>
      {children}
    </ChatUsageContext.Provider>
  );
}

/**
 * ChatContextUsage
 * Displays token usage information for the chat
 * Shows input, output, reasoning, and cache usage
 */
export type ChatContextUsageProps = React.ComponentProps<"div"> & {
  maxTokens?: number;
  usedTokens?: number;
};

export function ChatContextUsage(props: ChatContextUsageProps) {
  const {
    usage,
    maxTokens: defaultMaxTokens,
    usedTokens: defaultUsedTokens,
  } = useChatUsageContext();

  const {
    maxTokens = defaultMaxTokens,
    usedTokens = defaultUsedTokens,
    ...others
  } = props;

  // console.log({ usage, maxTokens, usedTokens });

  return (
    <Context
      {...others}
      maxTokens={maxTokens}
      modelId={usage.modelId}
      usage={usage}
      usedTokens={usedTokens}
    >
      <ContextTrigger>
        <div className="cursor-pointer hover:text-accent-foreground">
          <ContextIcon />
        </div>
      </ContextTrigger>
      <ContextContent align="end">
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
