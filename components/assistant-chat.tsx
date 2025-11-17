"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  ChatAutoResume,
  type ChatControllerProps,
  ChatProvider,
  ChatRouteParamsHandler,
} from "./chat";
import { ChatArtifact } from "./chat-artifact";
import { DefaultChatMessage } from "./chat-message";
import {
  ChatThread,
  ChatThreadComposer,
  ChatThreadEmpty,
  ChatThreadHeader,
  ChatThreadInput,
  ChatThreadMessages,
} from "./chat-thread";
import { DataStreamHandler } from "./data-stream-handler";

function PureAssistantChat({
  autoResume = false,
  api,
  initialInput,
  initialMessages,
  initialUsage,
  initialVisibilityType,
  id,
  chatId,
  ...others
}: React.ComponentProps<typeof ChatThread> &
  Omit<ChatControllerProps, "id"> & {
    autoResume?: boolean;
    initialInput?: string;
    chatId: string;
  }) {
  const providerProps = {
    id: chatId,
    api,
    initialInput,
    initialMessages,
    initialUsage,
    initialVisibilityType,
  };

  return (
    <ChatProvider {...providerProps}>
      <ChatThread {...others}>
        <ChatThreadHeader />
        <ChatThreadMessages empty={<ChatThreadEmpty />}>
          {({ key, message, isLastMessage, ...messageProps }) => (
            <DefaultChatMessage
              className={cn({
                "min-h-96": message.role === "assistant" && isLastMessage,
              })}
              isLastMessage={isLastMessage}
              key={key}
              message={message}
              {...messageProps}
            />
          )}
        </ChatThreadMessages>
        <ChatThreadComposer>
          <ChatThreadInput />
        </ChatThreadComposer>
      </ChatThread>
      <ChatArtifact />
      {autoResume && <ChatAutoResume />}
      <ChatRouteParamsHandler />
      <DataStreamHandler />
    </ChatProvider>
  );
}

export const AssistantChat = memo(PureAssistantChat, (prev, next) => {
  if (prev.chatId !== next.chatId) {
    return false;
  }
  return true;
});
