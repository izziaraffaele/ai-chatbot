"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/elements/conversation";
import { cn } from "@/lib/utils";

export const ChatThread = ({
  className,
  ...others
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "relative flex h-dvh min-w-0 flex-col overflow-hidden bg-background",
        className
      )}
      data-slot="chat-thread"
      {...others}
    />
  );
};

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

export const ChatThreadComposer = ({
  className,
  ...others
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "z-1 mx-auto flex w-full max-w-4xl shrink-0 gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4",
        className
      )}
      data-slot="chat-thread-composer"
      {...others}
    />
  );
};
