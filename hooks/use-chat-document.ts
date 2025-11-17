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
  const latestIndex = Math.max(0, latestVersion - 1);

  useEffect(() => {
    // Set current index to the latest version when data loads
    if (latestVersion > 0) {
      setCurrentIndex(latestIndex);
    }
  }, [latestVersion, latestIndex]);

  return {
    entries: data || [],
    currentIndex,
    latestVersion,
    latestIndex,
    isLatest: currentIndex === latestIndex,
    setCurrentIndex,
    isLoading,
    mutate,
  };
}

// export function useChatDocumentEditor(documentId: string | null) {

// }
