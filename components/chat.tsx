'use client';

import { Chat as ChatController } from '@ai-sdk/react';
import {
  ChatInit,
  DefaultChatTransport,
  HttpChatTransportInitOptions,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useSearchParams } from 'next/navigation';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useClientTools } from '@/hooks/use-client-tools';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import { fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { useDataStream } from './data-stream-provider';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { VisibilityType } from './visibility-selector';
import { useRuntimeConfig } from '@/hooks/use-runtime-config';
import {
  processClientToolCall,
  serializeClientTools,
} from '@/lib/ai/client-tools';
import { useChatUsage } from '@/hooks/use-chat-usage';
import { PromptInputProvider } from './elements/prompt-input';

const CHAT_API =
  process.env.CHAT_API || process.env.NEXT_PUBLIC_CHAT_API || '/api/chat';

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
    throw new Error('Invalid runtime context');
  }
  return value;
}

export type ChatControllerProps = {
  id: string;
  api?: string;
  initialMessages?: ChatMessage[];
  initialVisibilityType?: VisibilityType;
  initialUsage?: AppUsage;
};

export function useChatController({
  id,
  api,
  initialMessages = [],
  initialVisibilityType = 'private',
  initialUsage,
}: ChatControllerProps): ChatController<ChatMessage> {
  const { mutate } = useSWRConfig();

  // const { selectedAgent } = useSelectedAgent();

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
  const usage = useChatUsage({ chatId: id, initialValue: initialUsage });

  const transport = useRef(
    createChatTransport({
      api,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedVisibilityType: visibilityType,
            runtimeConfig,
            tools: serializeClientTools(registry.getTools()),
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
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === 'data-usage') {
        usage.setValue(dataPart.data);
      }
    },
    onFinish() {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError(error) {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
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
      if (!result) return;
      console.log(result);

      // Send the result back to the stream (no await to avoid deadlocks)
      // controller.addToolResult(result);
    },
  };

  const [chat, setChat] = useState<ChatController<ChatMessage>>(
    new ChatController(chatConfig)
  );

  useEffect(() => {
    setChat(new ChatController(chatConfig));
    // NOTE: we only want to run only if the chat id changes
    // eslint-disable-next-line
  }, [chatConfig.id]);

  return chat;
}

export const ChatProvider = (
  props: React.PropsWithChildren<ChatControllerProps> & {
    initialInput?: string;
  }
) => {
  const { children, initialInput, ...controllerProps } = props;

  const chat = useChatController(controllerProps);
  const runtime = useMemo(() => ({ chat }), [chat]);

  return (
    <ChatRuntimeContext.Provider value={runtime}>
      <PromptInputProvider initialInput={initialInput}>
        {children}
      </PromptInputProvider>
    </ChatRuntimeContext.Provider>
  );
};

export const ChatAutoResume = (props: {
  initialMessages?: ChatMessage[];
  enabled?: boolean;
}) => {
  const { initialMessages = [], enabled = true } = props;

  const { chat } = useChatRuntime();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const mostRecentMessage = initialMessages.at(-1);

    if (mostRecentMessage?.role === 'user') {
      chat.resumeStream();
    }

    // we intentionally control hook execution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, initialMessages.at, chat?.id]);

  return null;
};

export const ChatRouteParamsHandler = () => {
  const { chat } = useChatRuntime();
  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const hasAppendedQueryRef = useRef(false);

  const lastMessage = chat.messages.at(0);
  const shouldAppendQuery =
    !lastMessage ||
    (chat.messages.length === 1 && lastMessage.role === 'assistant');

  useEffect(() => {
    if (query && shouldAppendQuery && !hasAppendedQueryRef.current) {
      chat.sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      hasAppendedQueryRef.current = true;
      window.history.replaceState({}, '', `/chat/${chat.id}`);
    }
  }, [query, shouldAppendQuery]);

  return null;
};
