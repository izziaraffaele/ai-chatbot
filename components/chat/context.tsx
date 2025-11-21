"use client";

import {
  Chat as ChatController,
  type UseChatHelpers,
  useChat,
} from "@ai-sdk/react";

import {
  type ChatInit,
  type FileUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { nanoid } from "nanoid";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useLocalStorage } from "usehooks-ts";
import type {
  AttachmentsContext,
  PromptInputControllerProps,
  PromptInputMessage,
} from "@/components/elements/prompt-input";
import { getChatHistoryPaginationKey } from "@/components/sidebar-history";
import { toast } from "@/components/toast";
import type { VisibilityType } from "@/components/visibility-selector";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useClientTools } from "@/hooks/use-client-tools";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useSelectedAgent } from "@/hooks/use-selected-agent";
import {
  processClientToolCall,
  serializeClientTools,
} from "@/lib/ai/client-tools";
import { ChatSDKError } from "@/lib/errors";
import { createChatTransport } from "@/lib/runtime";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { generateUUID } from "@/lib/utils";
import { useDataStream } from "./streaming";
import { ChatUsageProvider } from "./usage";

// ============================================================================
// Chat Context (Global State)
// ============================================================================

export type ChatContextValue = {
  // Global input state (accessible anywhere)
  inputValue: string;
  setInput: (value: string) => void;
  clearInput: () => void;

  // Global attachments state
  attachments: FileUIPart[];
  addAttachments: (files: File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // Chat integration
  sendMessage: (
    message: PromptInputMessage & { metadata?: ChatMessage["metadata"] }
  ) => void;
  setMessages: (messages: ChatMessage[]) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  chatId: string;
  stop: () => void;

  // Error handling
  error: UseChatHelpers<ChatMessage>["error"];
  clearError: () => void;

  // internals
  chat: ChatController<ChatMessage>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return ctx;
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
      setDataStream((ds) => (ds ? [...ds, dataPart] : [dataPart]));
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

export function useChatInputController(props: { initialTextInput?: string }) {
  const { initialTextInput = "" } = props;

  // ----- textInput state
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = useCallback(() => setTextInput(""), []);

  // ----- attachments state (global when wrapped)
  const [attachements, setAttachements] = useState<
    (FileUIPart & { id: string })[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef<() => void>(() => {
    return;
  });

  const add = useCallback((files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      return;
    }

    setAttachements((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: "file" as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        }))
      )
    );
  }, []);

  const remove = useCallback((id: string) => {
    setAttachements((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setAttachements((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
      return [];
    });
  }, []);

  const openFileDialog = useCallback(() => {
    openRef.current?.();
  }, []);

  const attachments = useMemo<AttachmentsContext>(
    () => ({
      files: attachements,
      add,
      remove,
      clear,
      openFileDialog,
      fileInputRef,
    }),
    [attachements, add, remove, clear, openFileDialog]
  );

  const __registerFileInput = useCallback(
    (ref: React.RefObject<HTMLInputElement | null>, open: () => void) => {
      fileInputRef.current = ref.current;
      openRef.current = open;
    },
    []
  );

  const controller = useMemo<PromptInputControllerProps>(
    () => ({
      textInput: {
        value: textInput,
        setInput: setTextInput,
        clear: clearInput,
      },
      attachments,
      __registerFileInput,
    }),
    [textInput, clearInput, attachments, __registerFileInput]
  );
  return controller;
}

export function useChatMessages() {
  const { chat } = useChatContext();
  const { messages, setMessages } = useChat({ chat });
  return { messages, setMessages };
}

const PureChatProvider = (
  props: React.PropsWithChildren<ChatControllerProps> & {
    initialInput?: string;
    initialUsage?: AppUsage;
  }
) => {
  const { children, initialInput, initialUsage, ...controllerProps } = props;

  const chat = useChatController(controllerProps);
  const { status, error, clearError, setMessages } = useChat({ chat });

  const { selectedAgent } = useSelectedAgent();

  // Global state management (extracted from useChatComposer)
  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  const input = useChatInputController({
    initialTextInput: initialInput || localStorageInput,
  });

  const inputValue = input.textInput.value;

  // Persist input to localStorage
  useEffect(() => {
    setLocalStorageInput(inputValue);
  }, [setLocalStorageInput, inputValue]);

  const submitForm = useCallback(
    (message: PromptInputMessage & { metadata?: ChatMessage["metadata"] }) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      chat.sendMessage({
        text: message.text || "Sent with attachments",
        files: message.files,
        metadata: { forwardTo: selectedAgent?.registryId, ...message.metadata },
      });

      input.textInput.setInput("");
      input.attachments.clear();

      window.history.pushState({}, "", `/chat/${chat.id}`);
    },
    [chat, input, selectedAgent]
  );

  const sendMessage = useCallback(
    (message: PromptInputMessage & { metadata?: ChatMessage["metadata"] }) => {
      submitForm(message);
    },
    [submitForm]
  );

  const clearInput = useCallback(() => {
    input.textInput.setInput("");
  }, [input.textInput]);

  const addAttachments = useCallback(
    (files: File[]) => {
      input.attachments.add(files);
    },
    [input.attachments]
  );

  const removeAttachment = useCallback(
    (id: string) => {
      input.attachments.remove(id);
    },
    [input.attachments]
  );

  const clearAttachments = useCallback(() => {
    input.attachments.clear();
  }, [input.attachments]);

  // biome-ignore lint: this should change if the chat.id or inputs change
  const chatContextValue = useMemo<ChatContextValue>(
    () => ({
      inputValue,
      setInput: input.textInput.setInput,
      clearInput,
      attachments: input.attachments.files,
      addAttachments,
      removeAttachment,
      clearAttachments,
      sendMessage,
      setMessages,
      status,
      chatId: chat.id,
      stop: chat.stop,
      error,
      clearError,
      chat,
    }),
    [input.textInput.value, input.attachments.files, chat.id, status, error]
  );

  return (
    <ChatContext.Provider value={chatContextValue}>
      <ChatUsageProvider initialUsage={initialUsage}>
        {children}
      </ChatUsageProvider>
    </ChatContext.Provider>
  );
};

export const ChatProvider = memo(PureChatProvider, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.children === nextProps.children &&
    prevProps.api === nextProps.api
  );
});
