"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import { DocumentPreview } from "@/components/document-preview";
import type { InferToolUIComponentProps } from "./types";

export type CreateDocumentToolUIProps =
  InferToolUIComponentProps<"tool-createDocument">;

/**
 * CreateDocumentToolUI Component
 * Displays document creation tool invocations with input parameters and document preview
 * Memoized to prevent re-renders when part or isReadonly props haven't changed
 */
function PureCreateDocumentToolUI({
  part,
  isReadonly = false,
}: CreateDocumentToolUIProps) {
  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        Error creating document: {String(part.output.error)}
      </div>
    );
  }

  // Render DocumentPreview directly, matching original behavior
  return <DocumentPreview isReadonly={isReadonly} result={part.output} />;
}

export const CreateDocumentToolUI = memo(
  PureCreateDocumentToolUI,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

CreateDocumentToolUI.displayName = "CreateDocumentToolUI";
