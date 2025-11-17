"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useWindowSize } from "usehooks-ts";
import { useArtifact } from "@/hooks/use-artifact";
import { useArtifactStreaming } from "@/hooks/use-artifact-streaming";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { DocumentArtifact } from "./artifacts/document";
import { useChatRuntime } from "./chat";
import { ChatCanvas, ChatCanvasMain, ChatCanvasThread } from "./chat/canvas";
import {
  ChatComposer,
  ChatComposerAction,
  ChatComposerTool,
  ChatInput,
} from "./chat/composer";
import { ChatAutoResume, ChatRouteParamsHandler } from "./chat/effects";
import { MessageIterator } from "./chat/iterators";
import { DataStreamDispatcher } from "./chat/streaming";
import { ChatThread, ChatThreadContent, ChatThreadHeader } from "./chat/thread";
import { ChatThreadEmpty } from "./chat-thread";
import { AssistantMessage } from "./messages/assistant-message";
import { UserMessage } from "./messages/user-message";
import { SidebarToggle } from "./sidebar-toggle";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector } from "./visibility-selector";

/**
 * AssistantChat Component Props
 * NOTE: This component expects to be rendered INSIDE a ChatProvider
 */
export type AssistantChatProps = {
  /**
   * Whether to automatically resume streaming on mount
   */
  autoResume?: boolean;
  /**
   * Whether the chat is in readonly mode (no input)
   */
  isReadonly?: boolean;
  /**
   * Additional className for the thread
   */
  className?: string;
  /**
   * Additional className for the thread
   */
  promptInputMode?: "speech" | "text" | "prefer-speech" | "all";
};

export function AssistantChat({
  autoResume = false,
  isReadonly,
  className,
  promptInputMode = "prefer-speech",
}: AssistantChatProps) {
  const t = useTranslations();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const { chat } = useChatRuntime();
  const { artifact } = useArtifact();
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
  });

  // Subscribe to artifact streaming
  useArtifactStreaming();

  return (
    <>
      <ChatThread className={className}>
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

          {!isReadonly && (
            <VisibilitySelector
              className="order-1 md:order-2"
              onValueChange={setVisibilityType}
              value={visibilityType}
            />
          )}
        </ChatThreadHeader>

        <ChatThreadContent>
          <MessageIterator empty={<ChatThreadEmpty />}>
            {({
              message,
              isLastMessage,
              sender,
              vote,
              onVote,
              isStreaming,
            }) => {
              const baseProps = {
                message,
                isLastMessage,
                sender,
                isStreaming,
              };

              // Render based on message role
              if (message.role === "user") {
                return (
                  <UserMessage
                    {...baseProps}
                    className={cn({
                      "min-h-96": isLastMessage,
                    })}
                    isReadonly={isReadonly}
                    key={message.id}
                  />
                );
              }

              if (message.role === "assistant") {
                return (
                  <AssistantMessage
                    {...baseProps}
                    className={cn({
                      "min-h-96": isLastMessage,
                    })}
                    isReadonly={isReadonly}
                    key={message.id}
                    onVoteAction={onVote}
                    vote={vote}
                  />
                );
              }

              // Skip other message types
              return null;
            }}
          </MessageIterator>
        </ChatThreadContent>

        {!isReadonly && (
          <ChatComposer>
            <ChatInput
              actions={({ status, hasInput }) => {
                const submitButton = (
                  <ChatComposerAction.Submit
                    disabled={!hasInput}
                    status={status}
                  />
                );

                if (hasInput || promptInputMode === "text") {
                  return submitButton;
                }

                if (["speech", "prefer-speech"].includes(promptInputMode)) {
                  return <ChatComposerAction.Speech />;
                }

                return (
                  <div className="flex gap-0.5">
                    <ChatComposerAction.Speech />
                    {submitButton}
                  </div>
                );
              }}
              placeholder={t("chat.input.placeholder", "Send a message...")}
              tools={
                <>
                  <ChatComposerTool.AttachmentMenu />
                  <ChatComposerTool.AgentSelector />
                  <ChatComposerTool.ContextUsage />
                </>
              }
            />
          </ChatComposer>
        )}
      </ChatThread>

      {/* Artifact Canvas View */}
      <ChatCanvas isVisible={artifact.isVisible}>
        {/* Message thread sidebar */}
        <ChatCanvasThread isCurrentVersion={true}>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4">
              <MessageIterator>
                {({
                  message,
                  isLastMessage,
                  sender,
                  vote,
                  onVote,
                  isStreaming,
                }) => {
                  const baseProps = {
                    message,
                    isLastMessage,
                    sender,
                    isStreaming,
                    className: "max-w-full",
                  };

                  if (message.role === "user") {
                    return <UserMessage {...baseProps} key={message.id} />;
                  }

                  if (message.role === "assistant") {
                    return (
                      <AssistantMessage
                        {...baseProps}
                        key={message.id}
                        onVoteAction={onVote}
                        vote={vote}
                      />
                    );
                  }

                  return null;
                }}
              </MessageIterator>
            </div>

            {/* Composer in canvas thread */}
            <div className="px-4 pb-4">
              <ChatComposer>
                <ChatInput
                  actions={({ status, hasInput }) => (
                    <ChatComposerAction.Submit
                      disabled={!hasInput}
                      status={status}
                    />
                  )}
                  placeholder={t("chat.input.placeholder", "Send a message...")}
                />
              </ChatComposer>
            </div>
          </div>
        </ChatCanvasThread>

        {/* Artifact display */}
        <ChatCanvasMain boundingBox={artifact.boundingBox}>
          {artifact.documentId && artifact.kind && (
            <DocumentArtifact
              documentId={artifact.documentId}
              kind={artifact.kind as "text" | "code" | "sheet"}
              title={artifact.title || "Untitled"}
            />
          )}
        </ChatCanvasMain>
      </ChatCanvas>

      {autoResume && <ChatAutoResume initialMessages={chat.messages} />}
      <ChatRouteParamsHandler />
      <DataStreamDispatcher />
    </>
  );
}
