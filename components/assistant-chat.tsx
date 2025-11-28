"use client";

import { useChat } from "@ai-sdk/react";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import {
  useArtifactStreaming,
  useTabStreamSync,
} from "@/hooks/use-artifact-streaming";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { getWidgetCategory } from "@/lib/canvas";
import { useTranslations } from "@/lib/i18n/use-translations";
import { DocumentArtifact, isDocumentArtifact } from "./artifacts/document";
import {
  DocumentSelectorArtifact,
  isDocumentSelectorArtifact,
} from "./artifacts/document-selector";
import { isMediaArtifact, MediaArtifact } from "./artifacts/media";
import { ChatCanvas, ChatCanvasMain, ChatCanvasThread } from "./chat/canvas";
import { CanvasTabs } from "./chat/canvas-tabs";
import { CanvasTabPanel, CanvasWidgetContainer } from "./chat/canvas-widget";
import {
  ChatComposerAction,
  ChatComposerTool,
  ChatInput,
} from "./chat/composer";
import { useChatRuntime } from "./chat/context";
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
import { ChatContextUsage } from "./chat/usage";
import { AssistantMessage } from "./messages/assistant-message";
import { UserMessage } from "./messages/user-message";
import { SidebarToggle } from "./sidebar-toggle";
import { ActivityToolProvider } from "./tools/activity";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector } from "./visibility-selector";

/**
 * Memoized placeholder for the canvas thread when not active.
 * Only re-renders when message count changes, not on every streaming update.
 * This significantly improves performance during sub-agent text streaming.
 */
const CanvasThreadPlaceholder = memo(
  function CanvasThreadPlaceholder({ messageCount }: { messageCount: number }) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-50">
        <span className="text-sm">
          {messageCount} message{messageCount !== 1 ? "s" : ""}
        </span>
      </div>
    );
  },
  (prevProps, nextProps) => prevProps.messageCount === nextProps.messageCount
);

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
  const { chat } = useChatRuntime();
  const { messages, status } = useChat({ chat });
  const {
    activeTab,
    activeTabData,
    isCanvasVisible,
    updateTabContent,
    updateTabStatus,
    closeTab,
  } = useCanvasTabs();

  // Track if the canvas thread should render full messages
  // We defer rendering until the user has interacted with the canvas thread
  // This prevents double-rendering during streaming
  const [canvasThreadActive, setCanvasThreadActive] = useState(false);
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
  });

  // Memoize event handlers to prevent re-renders of ChatThreadContent
  const handleCanvasThreadFocus = useCallback(() => {
    setCanvasThreadActive(true);
  }, []);

  const handleCanvasThreadMouseEnter = useCallback(() => {
    setCanvasThreadActive(true);
  }, []);

  // Subscribe to artifact streaming updates (updates global artifact state)
  useArtifactStreaming();

  // Subscribe to tab streaming sync (updates tab state directly from stream)
  // This replaces the problematic useEffect sync pattern
  useTabStreamSync();

  // Get the active artifact from the active tab
  const activeArtifact = activeTab?.artifact;

  // Handlers for CanvasWidgetContainer
  const handleContentChange = useCallback(
    (tabId: string, content: unknown) => {
      updateTabContent(tabId, content);
    },
    [updateTabContent]
  );

  const handleStatusChange = useCallback(
    (tabId: string, newStatus: "idle" | "streaming" | "error") => {
      updateTabStatus(tabId, newStatus);
    },
    [updateTabStatus]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      closeTab(tabId);
    },
    [closeTab]
  );

  // Check if widget is registered for the current artifact
  const useRegistryRenderer = useMemo(() => {
    if (!activeTabData) {
      return false;
    }
    // For now, use registry for selector widgets only
    // Document and media widgets will continue using their existing renderers
    // until they are fully migrated to the registry pattern
    return getWidgetCategory(activeTabData.kind) === "selector";
  }, [activeTabData]);

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

  // Render function for messages in main thread (always renders)
  const renderMainMessages = useMemo(
    () => (
      <MessageIterator empty={chatEmpty} keyPrefix="main">
        {({ message, isLastMessage, sender, vote, onVote, isStreaming }) => {
          const baseProps = {
            message,
            isLastMessage,
            sender,
            isStreaming,
          };

          // Render based on message role
          if (message.role === "user") {
            return <UserMessage {...baseProps} isReadonly={isReadonly} />;
          }

          if (message.role === "assistant") {
            return (
              <AssistantMessage
                {...baseProps}
                isReadonly={isReadonly}
                onVoteAction={onVote}
                vote={vote}
              />
            );
          }

          // Skip other message types
          return null;
        }}
      </MessageIterator>
    ),
    [chatEmpty, isReadonly]
  );

  // Render the active widget content
  const renderActiveWidget = () => {
    if (!activeArtifact || !activeTabData) {
      return null;
    }

    // Use the new CanvasWidgetContainer for registered widgets
    if (useRegistryRenderer) {
      return (
        <CanvasTabPanel isActive={true} tabId={activeTabData.id}>
          <CanvasWidgetContainer
            onClose={handleTabClose}
            onContentChange={handleContentChange}
            onStatusChange={handleStatusChange}
            tab={activeTabData}
          />
        </CanvasTabPanel>
      );
    }

    // Fallback to legacy rendering for document/media artifacts
    // These will be migrated to registry in a future iteration
    if (isDocumentArtifact(activeArtifact.kind)) {
      return (
        <DocumentArtifact
          documentId={activeArtifact.documentId}
          kind={activeArtifact.kind}
          title={activeArtifact.title || "Untitled"}
        />
      );
    }

    if (isMediaArtifact(activeArtifact.kind)) {
      return (
        <MediaArtifact
          documentId={activeArtifact.documentId}
          kind={activeArtifact.kind}
          title={activeArtifact.title || "Untitled"}
        />
      );
    }

    if (isDocumentSelectorArtifact(activeArtifact.kind)) {
      return <DocumentSelectorArtifact />;
    }

    return null;
  };

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

          <ChatThreadContent>{renderMainMessages}</ChatThreadContent>

          {!isReadonly && (
            <ChatThreadComposer>
              {messages.length === 0 && <ChatSuggestions mode="default" />}
              {chatInput}
              <div className="absolute top-4 right-4">
                <ChatContextUsage />
              </div>
            </ChatThreadComposer>
          )}
        </ChatThread>

        {/* Artifact Canvas View with Tabs */}
        <ChatCanvas isVisible={isCanvasVisible}>
          {/* Message thread sidebar - uses lazy rendering to avoid duplicate re-renders during streaming */}
          <ChatCanvasThread isCurrentVersion={true}>
            <ChatThreadContent
              className="pt-20"
              onFocus={handleCanvasThreadFocus}
              onMouseEnter={handleCanvasThreadMouseEnter}
            >
              {/* Only render messages when canvas thread is active to avoid double-rendering during streaming */}
              {canvasThreadActive ? (
                <MessageIterator empty={chatEmpty} keyPrefix="canvas">
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

                    if (message.role === "user") {
                      return (
                        <UserMessage {...baseProps} isReadonly={isReadonly} />
                      );
                    }

                    if (message.role === "assistant") {
                      return (
                        <AssistantMessage
                          {...baseProps}
                          isReadonly={isReadonly}
                          onVoteAction={onVote}
                          vote={vote}
                        />
                      );
                    }

                    return null;
                  }}
                </MessageIterator>
              ) : (
                /* Lightweight placeholder - memoized to prevent re-renders during streaming */
                <CanvasThreadPlaceholder messageCount={messages.length} />
              )}
            </ChatThreadContent>

            {/* Composer in canvas thread */}
            <ChatThreadComposer className="px-4 pb-4">
              {chatInput}
            </ChatThreadComposer>
          </ChatCanvasThread>

          {/* Artifact display with tabs */}
          <ChatCanvasMain
            boundingBox={activeArtifact?.boundingBox}
            tabBar={<CanvasTabs />}
          >
            {renderActiveWidget()}
          </ChatCanvasMain>
        </ChatCanvas>

        {autoResume && <ChatAutoResume initialMessages={chat.messages} />}
        <ChatRouteParamsHandler />
        <DataStreamDispatcher />
      </ChatSuggestionProvider>
    </ActivityToolProvider>
  );
}
