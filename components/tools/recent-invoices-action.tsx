"use client";

/**
 * Recent Invoices Action Provider
 *
 * Registers an assistant action that opens the document selector
 * directly to the "recent invoices" view (Fatture recenti 2026).
 */

import type { ReactNode } from "react";
import { z } from "zod";
import {
  DOCUMENT_SELECTOR_KIND,
  type DocumentSelectorContentWrapper,
} from "@/components/artifacts/document-selector";
import { useAssistantAction } from "@/hooks/use-assistant-action";
import { useCanvasTabs } from "@/hooks/use-canvas-tabs";

/**
 * Provider component that registers the openRecentInvoices assistant action.
 * This action opens the document selector canvas directly to the "recent invoices" view.
 */
export function RecentInvoicesActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { openTab } = useCanvasTabs();

  // Register the assistant action to open recent invoices view
  useAssistantAction({
    id: "openRecentInvoices",
    description:
      "Open the document selector panel directly to the 'Fatture recenti' (recent invoices) view, showing 2026 XML invoices organized by month. Use this when the user explicitly asks to see recent invoices.",
    inputSchema: z.object({}),
    execute: () => {
      // Create content wrapper with initial view mode set to "recent-invoices"
      const wrappedContent: DocumentSelectorContentWrapper = {
        data: null, // No pre-loaded data needed - the view will load its own data
        initialViewMode: "recent-invoices",
      };

      // Open the document selector tab with the wrapped content
      openTab(
        {
          documentId: "document-selector",
          kind: DOCUMENT_SELECTOR_KIND,
          content: wrappedContent,
          title: "Fatture recenti",
          isVisible: true,
          status: "idle",
          boundingBox: {
            top: window.innerHeight / 4,
            left: window.innerWidth / 2,
            width: 300,
            height: 200,
          },
        },
        "Fatture recenti"
      );

      return Promise.resolve({
        success: true,
        message:
          "Apro il pannello delle fatture recenti. Vedrai le fatture elettroniche del 2026 organizzate per mese.",
      });
    },
  });

  return <>{children}</>;
}
