"use client";

import { Chat as ChatController } from "@ai-sdk/react";
import {
  type ChatInit,
  DefaultChatTransport,
  type HttpChatTransportInitOptions,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import type React from "react";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PromptInputProvider } from "@/components/elements/prompt-input";
import { getChatHistoryPaginationKey } from "@/components/sidebar-history";
import { toast } from "@/components/toast";
import type { VisibilityType } from "@/components/visibility-selector";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useClientTools } from "@/hooks/use-client-tools";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useSelectedAgent } from "@/hooks/use-selected-agent";
import { getTabsState } from "@/hooks/use-canvas-tabs";
import { getSelectedInvoice, getVisibleContent } from "@/lib/canvas";
import {
  processClientToolCall,
  serializeClientTools,
} from "@/lib/ai/client-tools";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { useDataStream } from "./streaming";
import { ChatUsageProvider, useChatUsageContext } from "./usage";

const CHAT_API =
  process.env.CHAT_API || process.env.NEXT_PUBLIC_CHAT_API || "/api/chat";

export function createChatTransport(
  props: Partial<HttpChatTransportInitOptions<ChatMessage>>
) {
  return new DefaultChatTransport({
    api: CHAT_API,
    fetch: fetchWithErrorHandlers,
    ...props,
  });
}

export type ChatRuntime = {
  chat: ChatController<ChatMessage>;
};

const ChatRuntimeContext = createContext<ChatRuntime>({
  chat: new ChatController({}),
});

export function useChatRuntime(): ChatRuntime {
  const value = useContext(ChatRuntimeContext);
  if (!value) {
    throw new Error("Invalid runtime context");
  }
  return value;
}

export type ChatControllerProps = {
  id: string;
  api?: string;
  initialMessages?: ChatMessage[];
  initialVisibilityType?: VisibilityType;
};

export function useChatController({
  id,
  api,
  initialMessages = [],
  initialVisibilityType = "private",
}: ChatControllerProps): ChatController<ChatMessage> {
  const { mutate } = useSWRConfig();

  // Selected agent for dynamic agent routing
  const { selectedAgent } = useSelectedAgent();
  // Use ref to always get latest selectedAgent in transport callback
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;

  // visibility state
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  // runtime
  const runtimeConfig = useRuntimeConfig();

  // client tools
  const registry = useClientTools();

  // streaming
  const { setDataStream } = useDataStream();

  // usage
  const { setUsage } = useChatUsageContext();

  // Batching mechanism for data stream updates
  // Accumulates parts synchronously and flushes via requestAnimationFrame
  // This ensures no chunks are dropped while maintaining smooth UI
  const pendingDataPartsRef = useRef<any[]>([]);
  const flushScheduledRef = useRef(false);

  const flushDataParts = useMemo(
    () => () => {
      flushScheduledRef.current = false;
      const partsToFlush = pendingDataPartsRef.current;
      if (partsToFlush.length === 0) {
        return;
      }

      // Clear the buffer before updating state
      pendingDataPartsRef.current = [];

      // Use startTransition for non-blocking update, but batch all parts together
      startTransition(() => {
        setDataStream((ds) => (ds ? [...ds, ...partsToFlush] : partsToFlush));
      });
    },
    [setDataStream]
  );

  const transport = useRef(
    createChatTransport({
      api,
      prepareSendMessagesRequest(request) {
        // Get current canvas state synchronously for active tab context
        const tabsState = getTabsState();
        const activeTab = tabsState.tabs.find(
          (tab) => tab.id === tabsState.activeTabId
        );

        // Check if the active tab has visible content registered
        // (for complex widgets like Fondazione Browser showing a file)
        const viewedContent = activeTab
          ? getVisibleContent(activeTab.id)
          : undefined;

        // Build canvas context with active tab info for agent awareness
        const canvasContext = activeTab
          ? {
              activeTab: {
                title: activeTab.title,
                kind: activeTab.artifact.kind,
                documentId: activeTab.artifact.documentId,
                content: activeTab.artifact.content,
                // Include viewed content if widget has registered it
                viewedContent,
              },
            }
          : { activeTab: null };

        // Get selected invoice for deterministic document generation
        const selectedInvoiceRecordId = getSelectedInvoice();
        const invoiceContext = selectedInvoiceRecordId
          ? { selectedInvoiceRecordId }
          : undefined;

        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedVisibilityType: visibilityType,
            runtimeConfig,
            tools: serializeClientTools(registry.getTools()),
            agentId: selectedAgentRef.current?.registryId, // Dynamic agent selection via ref
            canvasContext, // Include active canvas tab for document-aware responses
            invoiceContext, // Include selected invoice for deterministic document generation
            ...request.body,
          },
        };
      },
    })
  );

  const chatConfig: ChatInit<ChatMessage> = {
    id,
    messages: initialMessages,
    transport: transport.current,
    generateId: generateUUID,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onData(dataPart) {
      // Accumulate data parts synchronously (no chunks dropped)
      pendingDataPartsRef.current.push(dataPart);

      // Schedule a batched flush via requestAnimationFrame
      // This batches rapid updates while maintaining smooth UI
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        requestAnimationFrame(flushDataParts);
      }

      // Usage updates are processed immediately for responsive UI feedback
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish() {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError(error) {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first (for proper type narrowing)
      if (toolCall.dynamic) {
        return;
      }

      // Execute the client tool and capture the result
      const result = await processClientToolCall(toolCall);

      // Exit early if no client tool call happened
      if (!result) {
        return;
      }

      // Send the result back to the stream (no await to avoid deadlocks)
      chat.addToolResult({
        tool: result.tool,
        toolCallId: result.toolCallId,
        output: result.output,
      });
    },
  };

  const [chat, setChat] = useState<ChatController<ChatMessage>>(
    new ChatController(chatConfig)
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: suppress dependency chatConfig
  useEffect(() => {
    if (chat.id !== chatConfig.id) {
      setChat(new ChatController(chatConfig));
    }
    // NOTE: we only want to run only if the chat id changes
  }, [chatConfig.id]);
  return chat;
}

export const ChatProvider = (
  props: React.PropsWithChildren<ChatControllerProps> & {
    initialInput?: string;
    initialUsage?: AppUsage;
  }
) => {
  const { children, initialInput, initialUsage, ...controllerProps } = props;

  const chat = useChatController(controllerProps);
  const runtime = useMemo(() => ({ chat }), [chat]);

  return (
    <ChatUsageProvider initialUsage={initialUsage}>
      <ChatRuntimeContext.Provider value={runtime}>
        <PromptInputProvider initialInput={initialInput}>
          {children}
        </PromptInputProvider>
      </ChatRuntimeContext.Provider>
    </ChatUsageProvider>
  );
};
