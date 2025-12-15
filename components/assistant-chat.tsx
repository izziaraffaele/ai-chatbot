"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useWindowSize } from "usehooks-ts";
import { useArtifact } from "@/hooks/use-artifact";
import { useArtifactStreaming } from "@/hooks/use-artifact-streaming";
import { useAssistant } from "@/hooks/use-assistant";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useTranslations } from "@/lib/i18n/use-translations";
import { DocumentArtifact, isDocumentArtifact } from "./artifacts/document";
import { isMediaArtifact, MediaArtifact } from "./artifacts/media";
import { ChatCanvas, ChatCanvasMain, ChatCanvasThread } from "./chat/canvas";
import {
  ChatComposerAction,
  ChatComposerTool,
  ChatInput,
} from "./chat/composer";
import { useChatContext, useChatMessages } from "./chat/context";
import { ChatAutoResume, ChatRouteParamsHandler } from "./chat/effects";
import { ChatGreeting } from "./chat/empty";
import { MessageIterator } from "./chat/iterators";
import { DataStreamDispatcher } from "./chat/streaming";
import {
  ChatSuggestionProvider,
  type ChatSuggestionProviderProps,
  ChatSuggestions,
} from "./chat/suggestions";
import {
  ChatThread,
  ChatThreadComposer,
  ChatThreadContent,
  ChatThreadHeader,
} from "./chat/thread";
import { AssistantMessage } from "./messages/assistant-message";
import { UserMessage } from "./messages/user-message";
import { SidebarToggle } from "./sidebar-toggle";
import { ActivityToolProvider } from "./tools/activity";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector } from "./visibility-selector";

/**
 * AssistantChat Component Props
 * NOTE: This component expects to be rendered INSIDE a ChatProvider
 */
export type AssistantChatProps = Omit<
  ChatSuggestionProviderProps,
  "children" | "onApply"
> & {
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

  onApplySuggestion?: (suggestion: string) => void;
};

export function AssistantChat({
  autoResume = false,
  isReadonly,
  className,
  promptInputMode = "prefer-speech",
  initialSuggestions,
  suggestions,
  autoApply,
  onApplySuggestion,
}: AssistantChatProps) {
  const t = useTranslations();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const { chat, status } = useChatContext();
  const { messages } = useChatMessages();
  const { artifact } = useArtifact();
  const assistant = useAssistant();

  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
  });

  // Subscribe to artifact streaming
  useArtifactStreaming();

  const chatInput = (
    <ChatInput
      actions={({ status: inputStatus, hasInput }) => {
        const submitButton = (
          <ChatComposerAction.Submit
            disabled={!hasInput}
            status={inputStatus}
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

        // Render based on message role
        if (message.role === "user") {
          return (
            <UserMessage
              {...baseProps}
              isReadonly={isReadonly}
              key={message.id}
            />
          );
        }

        if (message.role === "assistant") {
          return (
            <AssistantMessage
              {...baseProps}
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
  );
  return (
    <ActivityToolProvider>
      <ChatSuggestionProvider
        autoApply={autoApply}
        initialSuggestions={initialSuggestions}
        onApply={onApplySuggestion}
        suggestions={suggestions}
      >
        <ChatThread className={className} status={status}>
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

          <ChatThreadContent>{chatMessages}</ChatThreadContent>

          {!isReadonly && (
            <ChatThreadComposer>
              {messages.length === 0 && <ChatSuggestions mode="default" />}
              {chatInput}
            </ChatThreadComposer>
          )}
        </ChatThread>

        {/* Artifact Canvas View */}
        <ChatCanvas isVisible={artifact.isVisible}>
          {/* Message thread sidebar */}
          <ChatCanvasThread isCurrentVersion={true}>
            <ChatThreadContent className="pt-20">
              {chatMessages}
            </ChatThreadContent>

            {/* Composer in canvas thread */}
            <ChatThreadComposer className="px-4 pb-4">
              {chatInput}
            </ChatThreadComposer>
          </ChatCanvasThread>

          {/* Artifact display */}
          <ChatCanvasMain boundingBox={artifact.boundingBox}>
            {isDocumentArtifact(artifact.kind) && (
              <DocumentArtifact artifact={artifact} isReadonly={isReadonly} />
            )}
            {isMediaArtifact(artifact.kind) && (
              <MediaArtifact
                documentId={artifact.documentId}
                kind={artifact.kind}
                title={artifact.title || t("artifact.document.untitled", "Untitled")}
              />
            )}
          </ChatCanvasMain>
        </ChatCanvas>

        {autoResume && <ChatAutoResume initialMessages={chat.messages} />}
        <ChatRouteParamsHandler />
        <DataStreamDispatcher />
      </ChatSuggestionProvider>
    </ActivityToolProvider>
  );
}
