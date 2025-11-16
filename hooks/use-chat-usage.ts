import useSWR from "swr";
import type { AppUsage } from "@/lib/usage";

export function useChatUsage(props: {
  chatId: string;
  initialValue?: AppUsage;
}) {
  const fallbackData = props.initialValue || {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  const { data, mutate } = useSWR<AppUsage>(
    ["chat-usage", props.chatId],
    null,
    {
      fallbackData,
    }
  );

  return {
    value: data || fallbackData,
    setValue: mutate as React.Dispatch<React.SetStateAction<AppUsage>>,
  };
}
