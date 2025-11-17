"use client";
import { useChat } from "@ai-sdk/react";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useWindowSize } from "usehooks-ts";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useChatVotes } from "@/hooks/use-chat-votes";
import type { Vote } from "@/lib/db/schema";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useChatRuntime } from "./chat";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./elements/conversation";
import { MultimodalInput } from "./multimodal-input";
import { SidebarToggle } from "./sidebar-toggle";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector } from "./visibility-selector";

export const ChatThread = ({
  className,
  isReadonly,
  asChild,
  ...others
}: React.ComponentProps<"div"> & {
  isReadonly?: boolean;
  asChild?: boolean;
}) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn(
        "flex h-dvh min-w-0 flex-col overflow-hidden bg-background",
        className
      )}
      data-slot="chat-thread"
      {...others}
    />
  );
};

export function ChatThreadHeader({
  isReadonly,
  className,
  ...others
}: React.ComponentProps<"header"> & { isReadonly?: boolean }) {
  const t = useTranslations();

  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  const runtime = useChatRuntime();
  const chatId = runtime.chat.id;

  const { visibilityType, setVisibilityType } = useChatVisibility({ chatId });

  return (
    <header
      className={cn(
        "sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2",
        className
      )}
      data-slot="chat-thread-header"
      {...others}
    >
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
    </header>
  );
}

export type ChatThreadMessageProps = {
  key: string;
  className?: string;
  message: ChatMessage;
  sender: {
    displayName?: string;
    avatar?: React.ReactNode;
  } | null;
  vote: Vote | undefined;
  isLastMessage: boolean;
  isStreaming: boolean;
  requiresScrollPadding: boolean;
  onVote: (value: "up" | "down", notes?: string) => Promise<void> | void;
};

export function ChatThreadMessages({
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
    <Conversation
      className={className}
      data-slot="chat-thread-messages"
      {...others}
    >
      <ConversationContent className="mx-auto flex max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
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
      <ConversationScrollButton />
    </Conversation>
  );
}

export const ChatThreadComposer = ({
  className,
  ...others
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4",
        className
      )}
      data-slot="chat-thread-composer"
      {...others}
    />
  );
};

export const ChatThreadInput = ({
  showSuggestion,
  ...others
}: {
  className?: string;
  showSuggestion?: boolean;
}) => {
  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });

  return (
    <MultimodalInput
      {...others}
      chatId={chat.id}
      sendMessage={chat.sendMessage}
      showSuggestion={showSuggestion === true || chat.messages.length === 0}
      status={chat.status}
      stop={chat.stop}
    />
  );
};

export const ChatThreadEmpty = ({
  className,
  primaryText,
  secondaryText,
  ...others
}: React.ComponentProps<"div"> & {
  primaryText?: React.ReactNode;
  secondaryText?: React.ReactNode;
}) => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      data-slot="chat-thread-empty"
      {...others}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        {primaryText}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        {secondaryText}
      </motion.div>
    </div>
  );
};
