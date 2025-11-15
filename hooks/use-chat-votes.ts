import useSWR from "swr";
import type { Vote } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

export function useChatVotes({ chatId }: { chatId: string | null }) {
  const { data: votes, mutate } = useSWR<Vote[]>(
    chatId ? `/api/vote?chatId=${chatId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    }
  );

  const voteMessage = (
    messageId: string,
    vote: "up" | "down",
    _notes?: string
  ) => {
    if (!chatId) {
      return;
    }

    // optimistically update cache
    mutate((value) => {
      const newValue = value?.filter((v) => v.messageId === messageId) || [];
      newValue.push({ chatId, messageId, isUpvoted: vote === "up" });

      return newValue;
    });

    fetch("/api/vote", {
      method: "PATCH",
      body: JSON.stringify({ messageId, chatId, type: vote }),
    }).catch((e) => {
      console.error(e);
    });
  };

  return { value: votes || [], setValue: mutate, voteMessage };
}
