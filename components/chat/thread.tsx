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
        "flex shrink-0 items-center gap-2 bg-background px-2 py-1.5 md:px-2",
        className
      )}
      data-slot="chat-thread-header"
      {...others}
    />
  );
};

/**
 * Main message content area with auto-scroll. Includes ConversationScrollButton.
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
        className="mx-auto flex max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4"
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
        "relative z-1 mx-auto flex w-full max-w-4xl shrink-0 gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4",
        className
      )}
      data-slot="chat-thread-composer"
      {...others}
    >
      <ChatComposer>{children}</ChatComposer>
    </div>
  );
};
