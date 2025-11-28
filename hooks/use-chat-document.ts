import { useEffect, useState } from "react";
import useSWR from "swr";
import { isPendingDocumentId } from "@/lib/canvas";
import type { Document } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

/**
 * Determines if a documentId is valid for fetching from the API.
 * Rejects null, "init", and temporary pending IDs (e.g., "pending-call_xxx").
 */
function shouldFetchDocument(documentId: string | null): boolean {
  if (documentId === null || documentId === "init") {
    return false;
  }
  // Pending IDs are temporary placeholders used during streaming before the
  // real document ID arrives. Don't query the API with these.
  if (isPendingDocumentId(documentId)) {
    return false;
  }
  return true;
}

export function useChatDocument(documentId: string | null) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const { data, isLoading, mutate } = useSWR<Document[]>(
    shouldFetchDocument(documentId) ? `/api/document?id=${documentId}` : null,
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
