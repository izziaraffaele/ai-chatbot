import { useChat } from '@ai-sdk/react';
import { Artifact } from './artifact';
import { useChatRuntime } from './chat';
import { useChatVotes } from '@/hooks/use-chat-votes';

export const ChatArtifact = (props: { isReadonly?: boolean }) => {
  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });
  const isStreaming = chat.status === 'streaming';
  const votes = useChatVotes({ chatId: chat.id });

  return (
    <Artifact
      chatId={chat.id}
      isReadonly={isStreaming || props.isReadonly || false}
      messages={chat.messages}
      regenerate={chat.regenerate}
      sendMessage={chat.sendMessage}
      setMessages={chat.setMessages}
      status={chat.status}
      stop={chat.stop}
      votes={votes.value}
    />
  );
};
