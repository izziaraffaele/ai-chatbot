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
 * Header branding with gold avatar and assistant info.
 * Shows the H-FARM Assistant identity in the header.
 */
export const ChatHeaderBranding = ({
  className,
  title = "H-FARM Assistant",
  subtitle = "",
  ...others
}: React.ComponentProps<"div"> & {
  title?: string;
  subtitle?: string;
}) => {
  return (
    <div className={cn("flex items-center gap-3", className)} {...others}>
      {/* H-FARM logo */}
      <img
        alt="H-FARM"
        className="h-10 shrink-0 object-contain"
        height={40}
        src="/images/hfarm_logo_text.png"
        width={80}
      />
      {/* Title and subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-semibold text-hf-deep-blue text-sm">
          {title}
        </h1>
        <p className="truncate text-hf-deep-blue/60 text-xs">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * Chat interface container with full-height layout.
 * H-FARM styled with lavender gradient background.
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
        // H-FARM chat thread - lavender gradient background
        "group/thread relative flex h-dvh min-w-0 flex-col overflow-hidden",
        "bg-gradient-to-br from-hf-lavender-start via-hf-lavender-mid to-hf-beige-end",
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
 * Glass-morphism style with subtle blur effect.
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
        // Glass-morphism header with blur effect
        "flex shrink-0 items-center gap-2 px-3 py-2 md:px-4",
        "border-hf-deep-blue/10 border-b bg-white/60 backdrop-blur-sm",
        className
      )}
      data-slot="chat-thread-header"
      {...others}
    />
  );
};

/**
 * Main message content area with auto-scroll. Includes ConversationScrollButton.
 * Generous padding and clean spacing for messages.
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
        // Chat content area - generous padding, max-width container
        className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-6"
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
 * Transparent background to show gradient through.
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
        // Composer area - transparent to show gradient, proper spacing
        "relative z-10 mx-auto flex w-full max-w-4xl shrink-0 gap-2 px-4 pb-6 md:px-6",
        className
      )}
      data-slot="chat-thread-composer"
      {...others}
    >
      <ChatComposer>{children}</ChatComposer>
    </div>
  );
};
