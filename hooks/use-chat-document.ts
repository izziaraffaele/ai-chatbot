import useSWR from 'swr';
import { Document } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function useChatDocument(documentId: string | null) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const { data, isLoading, mutate } = useSWR<Document[]>(
    documentId !== null && documentId !== 'init'
      ? `/api/document?id=${documentId}`
      : null,
    fetcher
  );

  const latestVersion = data?.length || 0;

  useEffect(() => {
    setCurrentIndex(latestVersion);
  }, [documentId]);

  return {
    entries: data || [],
    currentIndex,
    latestVersion: latestVersion,
    isLatest: currentIndex === latestVersion - 1,
    setCurrentIndex,
    isLoading,
    mutate,
  };
}
