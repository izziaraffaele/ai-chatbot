'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { VisibilitySelector } from './visibility-selector';
import { useChatVotes } from '@/hooks/use-chat-votes';
import { useTranslations } from '@/lib/i18n/use-translations';
import { useSidebar } from './ui/sidebar';
import { useWindowSize } from 'usehooks-ts';
import { SidebarToggle } from './sidebar-toggle';
import { Button } from './ui/button';
import Link from 'next/link';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from './elements/conversation';
import { Vote } from '@/lib/db/schema';
import { useChatRuntime } from './chat';
import { Message } from './elements/message';

export const ChatThread = ({
  className,
  isReadonly,
  ...others
}: React.ComponentProps<'div'> & { isReadonly?: boolean }) => {
  return (
    <div
      data-slot="chat-thread"
      className={cn(
        'overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background',
        className
      )}
      {...others}
    />
  );
};

export function ChatThreadHeader({
  isReadonly,
  className,
  ...others
}: React.ComponentProps<'header'> & { isReadonly?: boolean }) {
  const t = useTranslations();

  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  const runtime = useChatRuntime();
  const chatId = runtime.chat.id;

  const { visibilityType, setVisibilityType } = useChatVisibility({ chatId });

  return (
    <header
      data-slot="chat-thread-header"
      className={cn(
        'sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2',
        className
      )}
      {...others}
    >
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          variant="outline"
          asChild
        >
          <Link href="/">
            <PlusIcon />
            <span className="md:sr-only">
              {t('sidebar.buttonNewChat', 'New Chat')}
            </span>
          </Link>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          value={visibilityType}
          onValueChage={setVisibilityType}
          className="order-1 md:order-2"
        />
      )}
    </header>
  );
}

export type ChatThreadMessageProps = {
  key: string;
  message: ChatMessage;
  sender: {
    displayName?: string;
    avatar?: React.ReactNode;
  } | null;
  vote: Vote | undefined;
  isLastMessage: boolean;
  isStreaming: boolean;
  requiresScrollPadding: boolean;
  onVote: (value: 'up' | 'down', notes?: string) => Promise<void> | void;
};

export function ChatThreadMessages({
  empty = null,
  className,
  children: renderMessage,
  displayUser,
  displayAssistant,
  ...others
}: Omit<React.ComponentProps<'div'>, 'children'> & {
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
    <div
      className={cn(
        'overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll',
        className
      )}
      style={{ overflowAnchor: 'none' }}
      data-slot="chat-thread-messages"
      {...others}
    >
      <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
        <ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.length === 0 ? empty : null}

          {messages.map((message, index) => {
            const messageSender = senders[message.role];
            const messageVote = votes.find(
              (vote) => vote.messageId === message.id
            );

            const isLastMessage = index === messages.length - 1;

            return renderMessage({
              key: message.id,
              message: message,
              isLastMessage: isLastMessage,
              isStreaming: status === 'streaming' && isLastMessage,
              requiresScrollPadding: isLastMessage,
              vote: messageVote,
              onVote: (value, notes) => voteMessage(message.id, value, notes),
              sender: messageSender || null,
            });
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

export const ChatThreadComposer = ({
  isReadonly,
  className,
  ...others
}: React.ComponentProps<'div'> & { isReadonly?: boolean }) => {
  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });

  return (
    <div
      data-slot="chat-thread-composer"
      className={cn(
        'sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4',
        className
      )}
      {...others}
    >
      {!isReadonly && (
        <MultimodalInput
          chatId={chat.id}
          sendMessage={chat.sendMessage}
          status={chat.status}
          stop={chat.stop}
        />
      )}
    </div>
  );
};

export const ChatThreadEmpty = ({
  className,
  primaryText,
  secondaryText,
  ...others
}: React.ComponentProps<'div'> & {
  primaryText?: React.ReactNode;
  secondaryText?: React.ReactNode;
}) => {
  return (
    <div
      data-slot="chat-thread-empty"
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
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
