'use client';

import { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { updateChatVisibility } from '@/app/(chat)/actions';
import {
  type ChatHistory,
  getChatHistoryPaginationKey,
} from '@/components/sidebar-history';
import type { VisibilityType } from '@/components/visibility-selector';

export function useChatVisibility({
  chatId,
  initialVisibilityType = 'private',
}: {
  chatId: string;
  initialVisibilityType?: VisibilityType;
  onVisibilityChange?: (visibility: VisibilityType) => void;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get('/api/history')?.data;

  const { data: localVisibility, mutate: setLocalVisibility } =
    useSWR<VisibilityType>(['chat-visibility', chatId], null, {
      fallbackData: initialVisibilityType,
    });

  const visibilityType = useMemo(() => {
    if (!history) {
      return localVisibility || 'private';
    }
    const chat = history.chats.find((currentChat) => currentChat.id === chatId);
    if (!chat) {
      return 'private';
    }
    return chat.visibility;
  }, [history, chatId, localVisibility]);

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    setLocalVisibility(updatedVisibilityType);
    mutate(unstable_serialize(getChatHistoryPaginationKey));

    updateChatVisibility({
      chatId,
      visibility: updatedVisibilityType,
    });
  };

  return { visibilityType, setVisibilityType };
}
