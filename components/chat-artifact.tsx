import { useChat } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useWindowSize } from "usehooks-ts";
import { useArtifact } from "@/hooks/use-artifact";
import { useChatDocument } from "@/hooks/use-chat-document";
import { useChatVotes } from "@/hooks/use-chat-votes";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { artifactDefinitions, type UIArtifact } from "./artifact";
import { useChatRuntime } from "./chat";
import { DefaultChatMessage } from "./chat-message";
import {
  ChatThread,
  ChatThreadInput,
  type ChatThreadMessageProps,
} from "./chat-thread";
import type { ArtifactActionContext } from "./create-artifact";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "./elements/artifact";
import { Conversation, ConversationContent } from "./elements/conversation";
import { Toolbar } from "./toolbar";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";

export const ChatArtifactComposer = ({
  className,
  ...others
}: React.ComponentProps<"div">) => (
  <div
    {...others}
    className={cn(
      "relative flex w-full flex-row items-end gap-2 px-4 pb-4",
      className
    )}
  />
);

export const ChatArtifactThread = ({
  className,
  children,
  isCurrentVersion,
  ...others
}: React.ComponentProps<"div"> & {
  isCurrentVersion?: boolean;
}) => {
  return (
    <ChatThread
      asChild
      className={cn(
        "relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background",
        className
      )}
      {...others}
    >
      <motion.div
        animate={{
          opacity: 1,
          x: 0,
          scale: 1,
          transition: {
            delay: 0.1,
            type: "spring",
            stiffness: 300,
            damping: 30,
          },
        }}
        exit={{
          opacity: 0,
          x: 0,
          scale: 1,
          transition: { duration: 0 },
        }}
        initial={{ opacity: 0, x: 10, scale: 1 }}
      >
        <AnimatePresence>
          {!isCurrentVersion && (
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        {children}
      </motion.div>
    </ChatThread>
  );
};

export function ChatArtifactThreadMessages({
  empty = null,
  className,
  children: renderMessage,
  displayUser,
  displayAssistant,
  ...others
}: Omit<React.ComponentProps<"div">, "children"> & {
  empty?: React.ReactNode;
  displayUser?: { displayName?: string; avatar?: React.ReactNode };
  displayAssistant?: { displayName?: string; avatar?: React.ReactNode };
  children: (props: ChatThreadMessageProps) => React.ReactNode;
}) {
  const runtime = useChatRuntime();
  const { id: chatId, messages, status } = useChat({ chat: runtime.chat });

  const { value: votes, voteMessage } = useChatVotes({ chatId });

  const senders: Record<
    string,
    { displayName?: string; avatar?: React.ReactNode } | undefined
  > = { user: displayUser, assistant: displayAssistant };

  return (
    <Conversation {...others}>
      <ConversationContent className="flex min-h-full flex-col items-center gap-4 overflow-y-scroll pt-20">
        {messages.length === 0 ? empty : null}

        {messages.map((message, index) => {
          const messageSender = senders[message.role];
          const messageVote = votes.find(
            (vote) => vote.messageId === message.id
          );

          const isLastMessage = index === messages.length - 1;

          return renderMessage({
            key: message.id,
            message,
            isLastMessage,
            isStreaming: status === "streaming" && isLastMessage,
            requiresScrollPadding: isLastMessage,
            vote: messageVote,
            onVote: (value, notes) => voteMessage(message.id, value, notes),
            sender: messageSender || null,
          });
        })}
      </ConversationContent>
    </Conversation>
  );
}

export const ChatArtifactCanvas = ({
  width,
  height,
  className,
  boundingBox,
  ...others
}: React.ComponentProps<"div"> & {
  width: number;
  height: number;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}) => {
  const isMobile = useIsMobile();

  return (
    <motion.div
      {...(others as any)}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        height,
        width: width || "calc(100dvw)",
        borderRadius: 0,
        transition: {
          delay: 0,
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.8,
        },
        ...(!isMobile && {
          x: 400,
          width: width ? width - 400 : "calc(100dvw-400px)",
        }),
      }}
      className={cn(
        "fixed flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted",
        className
      )}
      data-slot="chat-artifact-panel"
      exit={{
        opacity: 0,
        scale: 0.5,
        transition: {
          delay: 0.1,
          type: "spring",
          stiffness: 600,
          damping: 30,
        },
      }}
      initial={{
        opacity: 1,
        x: boundingBox.left,
        y: boundingBox.top,
        height: boundingBox.height,
        width: boundingBox.width,
        borderRadius: 50,
      }}
    />
  );
};

export const ChatArtifactSummary = ({
  primaryText,
  secondaryText,
  children,
  ...others
}: React.ComponentProps<typeof ArtifactHeader> & {
  primaryText?: React.ReactNode;
  secondaryText?: React.ReactNode;
}) => (
  <div data-slot="chat-artifact-summary" {...others}>
    <ArtifactTitle>{primaryText}</ArtifactTitle>
    {secondaryText && (
      <ArtifactDescription>{secondaryText}</ArtifactDescription>
    )}
  </div>
);

export const ChatArtifactActions = ({
  artifact,
  mode = "view",
  latestVersionIndex = -1,
  isCurrentVersion = false,
  onVersionChange = () => {
    return;
  },
  metadata,
  setMetadata = () => {
    return;
  },
  ...others
}: React.ComponentProps<typeof ArtifactActions> & {
  artifact: UIArtifact;
  metadata?: Record<string, any>;
  setMetadata?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  mode?: "view" | "edit" | "diff";
  latestVersionIndex?: number;
  isCurrentVersion?: boolean;
  onVersionChange?: ArtifactActionContext["handleVersionChange"];
}) => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange: onVersionChange,
    currentVersionIndex: latestVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };

  return (
    <ArtifactActions {...others}>
      {artifactDefinition.actions.map((action, i) => (
        <ArtifactAction
          className={cn("h-fit dark:hover:bg-zinc-700", {
            "p-2": !action.label,
            "px-2 py-1.5": action.label,
          })}
          disabled={
            isLoading || artifact.status === "streaming"
              ? true
              : action.isDisabled
                ? action.isDisabled(actionContext)
                : false
          }
          key={`action-${artifact.kind}-${i}`}
          label={action.label}
          onClick={async () => {
            setIsLoading(true);

            try {
              await Promise.resolve(action.onClick(actionContext));
            } catch (_error) {
              toast.error(
                t("errors.artifactActionFailed", "Failed to execute action")
              );
            } finally {
              setIsLoading(false);
            }
          }}
          tooltip={action.description}
        >
          {action.icon}
        </ArtifactAction>
      ))}
    </ArtifactActions>
  );
};

export const ChatArtifactDisplay = ({
  className,
  ...others
}: React.ComponentProps<"div"> & {
  artifact: UIArtifact;
}) => {
  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });

  const { artifact, metadata, setMetadata, setArtifact } = useArtifact();
  const chatDocument = useChatDocument(artifact.documentId || null);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  const { save: saveContent, isDirty } = useDebouncedSave({
    onSave: (updatedContent: string, next) => {
      if (!artifact) {
        return;
      }

      chatDocument.mutate(
        async (currentDocuments) => {
          if (!currentDocuments) {
            return [];
          }

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            next();
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${artifact.documentId}`, {
              method: "POST",
              body: JSON.stringify({
                title: artifact.title,
                content: updatedContent,
                kind: artifact.kind,
              }),
            });

            next();

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false }
      );
    },
  });

  const handleVersionChange = (type: "next" | "prev" | "toggle" | "latest") => {
    if (!chatDocument.entries) {
      return;
    }

    if (type === "latest") {
      chatDocument.setCurrentIndex(chatDocument.entries.length - 1);
      setMode("edit");
    }

    if (type === "toggle") {
      setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
    }

    if (type === "prev") {
      if (chatDocument.currentIndex > 0) {
        chatDocument.setCurrentIndex((index) => index - 1);
      }
    } else if (
      type === "next" &&
      chatDocument.currentIndex + 1 < chatDocument.latestVersion
    ) {
      chatDocument.setCurrentIndex((index) => index + 1);
    }
  };

  const handleClose = useCallback(() => {
    setArtifact((currentArtifact) => ({
      ...currentArtifact,
      isVisible: false,
    }));
  }, [setArtifact]);

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const currentEntry = chatDocument.entries?.[chatDocument.currentIndex];

  const isCurrentVersion =
    chatDocument.entries && chatDocument.entries.length > 0
      ? chatDocument.isLatest
      : true;

  const updatedAt = useMemo(() => {
    if (!currentEntry) {
      return null;
    }
    return formatDistance(new Date(currentEntry.createdAt), new Date(), {
      addSuffix: true,
    });
  }, [currentEntry]);

  return (
    <Artifact
      className={cn("h-full rounded-none border-none", className)}
      data-slot="chat-artifact-display"
      {...others}
    >
      <ArtifactHeader>
        <div className="flex flex-row items-start gap-4">
          <ArtifactClose onClick={handleClose} />
          <ChatArtifactSummary
            primaryText={artifact.title}
            secondaryText={
              isDirty ? (
                "Saving changes..."
              ) : updatedAt ? (
                `Updated ${updatedAt}`
              ) : (
                <span className="mt-2 inline-block h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
              )
            }
          />
        </div>
        <ChatArtifactActions artifact={artifact} />
      </ArtifactHeader>
      <ArtifactContent className="h-full max-w-full! items-center overflow-y-scroll bg-background dark:bg-muted">
        <artifactDefinition.content
          content={
            chatDocument.isLatest
              ? artifact.content
              : currentEntry?.content || ""
          }
          currentVersionIndex={chatDocument.currentIndex}
          getDocumentContentById={(id) =>
            chatDocument.entries[id]?.content || ""
          }
          isCurrentVersion={chatDocument.isLatest}
          isInline={false}
          isLoading={chatDocument.isLoading && !artifact.content}
          metadata={metadata}
          mode={mode}
          onSaveContent={saveContent}
          setMetadata={setMetadata}
          status={artifact.status}
          suggestions={[]}
          title={artifact.title}
        />

        <AnimatePresence>
          {isCurrentVersion && (
            <Toolbar
              artifactKind={artifact.kind}
              isToolbarVisible={isToolbarVisible}
              sendMessage={chat.sendMessage}
              setIsToolbarVisible={setIsToolbarVisible}
              setMessages={chat.setMessages}
              status={chat.status}
              stop={chat.stop}
            />
          )}
        </AnimatePresence>
      </ArtifactContent>

      <AnimatePresence>
        {!isCurrentVersion && (
          <VersionFooter
            currentVersionIndex={chatDocument.currentIndex}
            documents={chatDocument.entries}
            handleVersionChange={handleVersionChange}
          />
        )}
      </AnimatePresence>
    </Artifact>
  );
};

export const ChatArtifact = () => {
  console.log("render artifact");
  const { artifact } = useArtifact();
  const isMobile = useIsMobile();
  const { open: isSidebarOpen } = useSidebar();

  const { width: windowWidth, height: windowHeight } = useWindowSize();

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          data-testid="artifact"
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
          initial={{ opacity: 1 }}
        >
          {!isMobile && (
            <motion.div
              animate={{ width: windowWidth, right: 0 }}
              className="fixed h-dvh bg-background"
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}
          {!isMobile && (
            <ChatArtifactThread isCurrentVersion={true}>
              <ChatArtifactThreadMessages>
                {({ key, ...messageProps }) => (
                  <DefaultChatMessage
                    className="max-w-full"
                    key={key}
                    {...messageProps}
                  />
                )}
              </ChatArtifactThreadMessages>
              <ChatArtifactComposer>
                <ChatThreadInput showSuggestion={false} />
              </ChatArtifactComposer>
            </ChatArtifactThread>
          )}
          <ChatArtifactCanvas
            boundingBox={artifact.boundingBox}
            height={windowHeight}
            width={windowWidth}
          >
            <ChatArtifactDisplay artifact={artifact} />
          </ChatArtifactCanvas>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
