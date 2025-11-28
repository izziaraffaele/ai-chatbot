"use client";

import { useChat } from "@ai-sdk/react";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { useWindowSize } from "usehooks-ts";
import {
  useArtifactStreaming,
  useTabStreamSync,
} from "@/hooks/use-artifact-streaming";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { type CanvasTabData, getWidgetCategory } from "@/lib/canvas";
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
    updateTabArtifact,
    updateTabContent,
    updateTabStatus,
    closeTab,
  } = useCanvasTabs();
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
  });

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
    (tabId: string, status: "idle" | "streaming" | "error") => {
      updateTabStatus(tabId, status);
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

  // Render function for messages (reused in both thread locations)
  const renderMessages = (keyPrefix?: string) => (
    <MessageIterator empty={chatEmpty} keyPrefix={keyPrefix}>
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

          <ChatThreadContent>{renderMessages("main")}</ChatThreadContent>

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
          {/* Message thread sidebar */}
          <ChatCanvasThread isCurrentVersion={true}>
            <ChatThreadContent className="pt-20">
              {renderMessages("canvas")}
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
