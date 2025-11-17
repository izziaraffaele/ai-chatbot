import { useEffect, useState } from "react";
import useSWR from "swr";
import type { Document } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

export function useChatDocument(documentId: string | null) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const { data, isLoading, mutate } = useSWR<Document[]>(
    documentId !== null && documentId !== "init"
      ? `/api/document?id=${documentId}`
      : null,
    fetcher
  );

  const latestVersion = data?.length || 0;

  useEffect(() => {
    setCurrentIndex(latestVersion);
  }, [latestVersion]);

  return {
    entries: data || [],
    currentIndex,
    latestVersion,
    isLatest: currentIndex === latestVersion - 1,
    setCurrentIndex,
    isLoading,
    mutate,
  };
}

// export function useChatDocumentEditor(documentId: string | null) {

// }
