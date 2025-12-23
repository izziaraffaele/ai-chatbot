"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useWindowSize } from "usehooks-ts";
import { useArtifact } from "@/hooks/use-artifact";
import { useArtifactStreaming } from "@/hooks/use-artifact-streaming";
import { useAssistant } from "@/hooks/use-assistant";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useTranslations } from "@/lib/i18n/use-translations";
import { PFBuilderArtifact } from "../artifacts/pf-builder";
import { ChatCanvas, ChatCanvasMain, ChatCanvasThread } from "../chat/canvas";
import {
  ChatComposerAction,
  ChatComposerTool,
  ChatInput,
} from "../chat/composer";
import { useChatContext, useChatMessages } from "../chat/context";
import { ChatGreeting } from "../chat/empty";
import { MessageIterator } from "../chat/iterators";
import { DataStreamDispatcher } from "../chat/streaming";
import { ChatSuggestionProvider, ChatSuggestions } from "../chat/suggestions";
import {
  ChatThread,
  ChatThreadComposer,
  ChatThreadContent,
  ChatThreadHeader,
} from "../chat/thread";
import { AssistantMessage } from "../messages/assistant-message";
import { UserMessage } from "../messages/user-message";
import { SidebarToggle } from "../sidebar-toggle";
import { ActivityToolProvider } from "../tools/activity";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";
import { VisibilitySelector } from "../visibility-selector";

type PFBuilderTestChatProps = {
  builderId: string;
};

/**
 * PFBuilderTestChat - Chat component with PF Builder canvas pre-initialized
 * Used for E2E testing the PF Builder flow
 */
export function PFBuilderTestChat({ builderId }: PFBuilderTestChatProps) {
  const t = useTranslations();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const { chat, status } = useChatContext();
  const { messages } = useChatMessages();
  const { artifact, setArtifact } = useArtifact();
  const assistant = useAssistant();

  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
  });

  // Subscribe to artifact streaming
  useArtifactStreaming();

  // Initialize PF Builder artifact on mount
  useEffect(() => {
    setArtifact({
      documentId: builderId,
      kind: "pf-builder",
      content: "",
      title: "Percorso Formativo Builder",
      isVisible: true,
      status: "idle",
      boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    });
  }, [builderId, setArtifact]);

  const chatInput = (
    <ChatInput
      actions={({ status: inputStatus, hasInput }) => (
        <ChatComposerAction.Submit disabled={!hasInput} status={inputStatus} />
      )}
      placeholder={t("chat.input.placeholder", "Send a message...")}
      showUsage
      tools={
        <>
          <ChatComposerTool.AttachmentMenu />
          <ChatComposerTool.AgentSelector />
        </>
      }
    />
  );

  const chatEmpty = (
    <ChatGreeting
      primaryText={t("chat.greeting.title", "Hello there!")}
      secondaryText={t("chat.greeting.subtitle", "How can I help you today?")}
    />
  );

  const chatMessages = (
    <MessageIterator displayAssistant={assistant} empty={chatEmpty}>
      {({ message, isLastMessage, sender, vote, onVote, isStreaming }) => {
        const baseProps = {
          message,
          isLastMessage,
          sender,
          isStreaming,
        };

        if (message.role === "user") {
          return (
            <UserMessage {...baseProps} isReadonly={false} key={message.id} />
          );
        }

        if (message.role === "assistant") {
          return (
            <AssistantMessage
              {...baseProps}
              isReadonly={false}
              key={message.id}
              onVoteAction={onVote}
              vote={vote}
            />
          );
        }

        return null;
      }}
    </MessageIterator>
  );

  return (
    <ActivityToolProvider>
      <ChatSuggestionProvider suggestions={[]}>
        <ChatThread status={status}>
          <ChatThreadHeader>
            <SidebarToggle />

            {(!open || windowWidth < 768) && (
              <Button
                asChild
                className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
                variant="outline"
              >
                <Link href="/">
                  <PlusIcon />
                  <span className="md:sr-only">
                    {t("sidebar.buttonNewChat", "New Chat")}
                  </span>
                </Link>
              </Button>
            )}

            <VisibilitySelector
              className="order-1 md:order-2"
              onValueChange={setVisibilityType}
              value={visibilityType}
            />
          </ChatThreadHeader>

          <ChatThreadContent>{chatMessages}</ChatThreadContent>

          <ChatThreadComposer>
            {messages.length === 0 && <ChatSuggestions mode="default" />}
            {chatInput}
          </ChatThreadComposer>
        </ChatThread>

        {/* PF Builder Canvas - Always visible in test mode */}
        <ChatCanvas isVisible={true}>
          {/* Message thread sidebar */}
          <ChatCanvasThread isCurrentVersion={true}>
            <ChatThreadContent className="pt-20">
              {chatMessages}
            </ChatThreadContent>

            <ChatThreadComposer className="px-4 pb-4">
              {chatInput}
            </ChatThreadComposer>
          </ChatCanvasThread>

          {/* PF Builder display */}
          <ChatCanvasMain
            boundingBox={artifact.boundingBox}
            data-testid="pf-builder-canvas"
          >
            <PFBuilderArtifact artifact={artifact} isReadonly={false} />
          </ChatCanvasMain>
        </ChatCanvas>

        <DataStreamDispatcher />
      </ChatSuggestionProvider>
    </ActivityToolProvider>
  );
}
