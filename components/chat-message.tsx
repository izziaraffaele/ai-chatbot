import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { CopyIcon, PencilIcon, SparklesIcon } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/use-translations';
import type { ChatThreadMessageProps } from './chat-thread';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from './elements/message';
import { cn, sanitizeText } from '@/lib/utils';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from './elements/reasoning';
import { isToolUIPart, ReasoningUIPart, TextUIPart } from 'ai';
import { ToolUIRouter } from './tool-ui-router';
import { ThumbDownIcon, ThumbUpIcon } from './icons';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { Vote } from '@/lib/db/schema';

type ChatMessageMode = 'view' | 'edit';

export const ChatMessage = ({
  from,
  className,
  mode = 'view',
  isStreaming,
  isReadonly,
  children,
  ...others
}: React.ComponentProps<typeof Message> & {
  mode?: ChatMessageMode;
  isStreaming?: boolean;
}) => (
  <Message
    from={from}
    className={cn(
      'items-end',
      {
        'justify-start flex-row-reverse':
          from === 'assistant' && mode !== 'edit',
      },
      className
    )}
    data-slot="chat-message"
    data-role={from}
    data-state={isStreaming ? 'streaming' : 'idle'}
    data-mode={isReadonly ? 'readonly' : mode}
    {...others}
  >
    <motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
      {children}
    </motion.div>
  </Message>
);

export const ChatMessageReasoning = ({
  isStreamingPart,
  part,
}: {
  part: ReasoningUIPart;
  isStreamingPart?: boolean;
}) => {
  const isStreaming = isStreamingPart === true || part.state === 'streaming';
  const reasoningText = part.text.trim();

  if (!reasoningText.length) return null;

  return (
    <Reasoning className="w-full" isStreaming={isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>{reasoningText}</ReasoningContent>
    </Reasoning>
  );
};

export const ChatMessageText = ({
  part,
  mode = 'view',
}: {
  part: TextUIPart;
  mode?: ChatMessageMode;
}) => {
  const reasoningText = part.text.trim();

  if (!reasoningText.length) return null;

  if (mode === 'edit') return null;

  return (
    <MessageContent
      className={cn(
        'group-[.is-user]:wrap-break-words group-[.is-user]:rounded-2xl group-[.is-user]:px-3! group-[.is-user]:py-2!'
      )}
    >
      <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
    </MessageContent>
  );
};

export const ChatMessageActions = ({
  onModeChange,
  onVote,
  isReadonly,
  message,
  vote,
  ...others
}: React.ComponentProps<typeof MessageActions> & {
  onModeChange?: (mode: ChatMessageMode) => void;
  onVote?: (vote: 'up' | 'down') => void;
  isReadonly?: boolean;
  message: ChatMessageType;
  vote?: Vote;
}) => {
  const t = useTranslations();
  const handleCopy = useCallback(() => {
    const messageText = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('\n\n');

    navigator.clipboard.writeText(messageText);
  }, [message]);

  return (
    <MessageActions {...others}>
      {!isReadonly && (
        <MessageAction onClick={() => onModeChange?.('edit')} label="Edit">
          <PencilIcon className="size-3" />
        </MessageAction>
      )}
      <MessageAction onClick={handleCopy} label="Copy">
        <CopyIcon className="size-3" />
      </MessageAction>
      {message.role === 'assistant' && (
        <MessageAction
          disabled={vote?.isUpvoted}
          onClick={() => onVote?.('up')}
          tooltip={t('message.actions.tooltipUpvote', 'Upvote Response')}
        >
          <ThumbUpIcon />
        </MessageAction>
      )}
      {message.role === 'assistant' && (
        <MessageAction
          disabled={vote?.isUpvoted === false}
          onClick={() => onVote?.('down')}
          tooltip={t('message.actions.tooltipDownvote', 'Downvote Response')}
        >
          <ThumbDownIcon />
        </MessageAction>
      )}
    </MessageActions>
  );
};

export const ChatMessageParts = ({
  className,
  message,
  mode = 'view',
  isLastMessage,
  isStreaming,
  isReadonly,
  ...others
}: React.ComponentProps<'div'> & {
  message: ChatMessageType;
  mode?: ChatMessageMode;
  isLastMessage?: boolean;
  isStreaming?: boolean;
  isReadonly?: boolean;
}) => {
  const lastPartIndex = message.parts.length - 1;
  const lastPart = lastPartIndex >= 0 ? message.parts[lastPartIndex] : null;

  const fileParts = message.parts.filter((p) => p.type === 'file');

  const isAssistant = message.role === 'assistant';

  const hasAttachments = fileParts.length > 0;

  return (
    <>
      {/* Attachments (usually visible only in user message) */}
      {hasAttachments && (
        <MessageAttachments className="mb-2">
          {fileParts.map((part) => (
            <MessageAttachment data={part} key={part.url} />
          ))}
        </MessageAttachments>
      )}

      {message.parts?.map((part, index) => {
        const { type } = part;
        const isLastPart = lastPartIndex === index;
        const isStreamingPart = isStreaming && isLastMessage && isLastPart;

        const key = `message-${message.id}-part-${index}`;

        switch (type) {
          case 'reasoning':
            return (
              <ChatMessageReasoning
                key={key}
                part={part}
                isStreamingPart={isStreamingPart}
              />
            );

          case 'text':
            return (
              <ChatMessageText
                key={key}
                part={part}
                mode={isReadonly ? 'view' : mode}
              />
            );

          default:
            // Tool UI rendering - delegate to ToolUIRouter for consistent handling
            if (isToolUIPart(part)) {
              return (
                <ToolUIRouter
                  key={part.toolCallId}
                  part={part}
                  isReadonly={isReadonly}
                />
              );
            }
            break;
        }

        // skip render unknown parts
        return null;
      })}
    </>
  );
};

export const ChatMessageAvatar = ({
  className,
  ...others
}: React.ComponentProps<'div'>) => (
  <div
    data-slot="chat-message-avatar"
    className={cn(
      '-mb-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border',
      className
    )}
    {...others}
  />
);

export const ChatMessageContent = ({
  className,
  ...others
}: React.ComponentProps<'div'>) => (
  <div
    data-slot="chat-message-content"
    className={cn(
      'flex flex-col group-data-[mode=edit]:w-full! group-[.is-user]:max-w-[calc(100%-2.5rem)] sm:group-[.is-user]:max-w-[min(fit-content,80%)]',
      className
    )}
    {...others}
  />
);

export const DefaultChatMessage = ({
  message,
  sender,
  vote,
  isReadonly = true,
  isStreaming,
  isLastMessage,
  onVote,
}: ChatThreadMessageProps & {
  isReadonly?: boolean;
  isLastMessage?: boolean;
}) => {
  const t = useTranslations();
  const [mode, setMode] = useState<ChatMessageMode>('view');

  const isAssistant = message.role === 'assistant';

  const avatar = sender?.avatar || (isAssistant ? <SparklesIcon /> : null);

  const hasText = message.parts?.some(
    (p) => p.type === 'text' && p.text?.trim()
  );

  return (
    <ChatMessage from={message.role} asChild>
      {avatar && <ChatMessageAvatar>{avatar}</ChatMessageAvatar>}
      <ChatMessageContent
        className={cn({
          'gap-2 md:gap-4': hasText,
          'min-h-96': isAssistant && isLastMessage,
          'w-full': isAssistant && hasText,
        })}
      >
        <ChatMessageParts
          message={message}
          mode={mode}
          isLastMessage={isLastMessage}
          isStreaming={isStreaming}
          isReadonly={isReadonly}
        />
        <ChatMessageActions
          onModeChange={setMode}
          onVote={onVote}
          isReadonly={isReadonly}
          message={message}
          vote={vote}
        />
      </ChatMessageContent>
    </ChatMessage>
  );
};
