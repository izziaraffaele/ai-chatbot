"use client";

import type { ChatStatus } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/elements/conversation";
import { cn } from "@/lib/utils";
import { ChatComposer } from "./composer";

/**
 * Chat interface container with full-height layout.
 * H-FARM styled with warm cream background and generous spacing.
 *
 * @example
 * <ChatThread>
 *   <ChatThreadHeader />
 *   <ChatThreadContent>
 *     <MessageIterator empty={<ChatThreadEmpty />} />
 *   </ChatThreadContent>
 *   <ChatThreadComposer>
 *     <ChatInput />
 *   </ChatThreadComposer>
 * </ChatThread>
 */
export const ChatThread = ({
  className,
  status,
  ...others
}: React.ComponentProps<"div"> & { status?: ChatStatus }) => {
  return (
    <div
      className={cn(
        // H-FARM chat thread - clean, professional layout
        "group/thread relative flex h-dvh min-w-0 flex-col overflow-hidden bg-background",
        className
      )}
      data-slot="chat-thread"
      data-status={status || "ready"}
      {...others}
    />
  );
};

/**
 * Chat header for navigation and controls.
 * H-FARM styled with subtle border and warm background.
 *
 * @example
 * <ChatThreadHeader>
 *   <SidebarToggle />
 *   <Button asChild variant="outline">
 *     <Link href="/"><PlusIcon /> New Chat</Link>
 *   </Button>
 *   <VisibilitySelector />
 * </ChatThreadHeader>
 */
export const ChatThreadHeader = ({
  className,
  ...others
}: React.ComponentProps<"header">) => {
  return (
    <header
      className={cn(
        // H-FARM header - clean with subtle bottom border
        "flex shrink-0 items-center gap-2 border-b border-border/50 bg-background px-3 py-2 md:px-4",
        className
      )}
      data-slot="chat-thread-header"
      {...others}
    />
  );
};

/**
 * Main message content area with auto-scroll. Includes ConversationScrollButton.
 * H-FARM styled with generous padding and clean spacing.
 *
 * @example
 * <ChatThreadContent>
 *   <MessageIterator empty={<ChatThreadEmpty />}>
 *     {({ message, isLastMessage, vote, onVote }) => (
 *       <AssistantMessage
 *         message={message}
 *         isLastMessage={isLastMessage}
 *         vote={vote}
 *         onVoteAction={onVote}
 *       />
 *     )}
 *   </MessageIterator>
 * </ChatThreadContent>
 */
export const ChatThreadContent = ({
  className,
  children,
  ...others
}: React.ComponentProps<typeof Conversation>) => {
  return (
    <Conversation className={cn("min-h-0 flex-1", className)} {...others}>
      <ConversationContent
        // H-FARM content area - generous padding, professional spacing
        className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 md:gap-6 md:px-6"
        data-slot="chat-thread-content"
      >
        {children}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};

/**
 * Bottom input container with spacing and z-index layering.
 * H-FARM styled composer area.
 *
 * @example
 * <ChatThreadComposer>
 *   <ChatInput
 *     placeholder="Send a message..."
 *     actions={({ status }) => <ChatComposerAction.Submit status={status} />}
 *   />
 * </ChatThreadComposer>
 */
export const ChatThreadComposer = ({
  className,
  children,
  ...others
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        // H-FARM composer area - clean bottom section
        "relative z-10 mx-auto flex w-full max-w-4xl shrink-0 gap-2 bg-background px-4 pb-4 md:px-6 md:pb-6",
        className
      )}
      data-slot="chat-thread-composer"
      {...others}
    >
      <ChatComposer>{children}</ChatComposer>
    </div>
  );
};
