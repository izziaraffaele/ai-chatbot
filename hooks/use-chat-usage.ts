import { AppUsage } from '@/lib/usage';
import useSWR from 'swr';

export function useChatUsage(props: {
  chatId: string;
  initialValue?: AppUsage;
}) {
  const { data, mutate } = useSWR(['chat-usage', props.chatId], null, {
    fallbackData: props.initialValue,
  });

  return {
    value: data,
    setValue: mutate as React.Dispatch<React.SetStateAction<AppUsage>>,
  };
}
