"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import { DocumentPreview } from "@/components/document-preview";
import type { InferToolUIComponentProps } from "./types";

export type UpdateDocumentToolUIProps =
  InferToolUIComponentProps<"tool-updateDocument">;

/**
 * UpdateDocumentToolUI Component
 * Displays document update tool invocations with input parameters and updated document preview
 * Memoized to prevent re-renders when part or isReadonly props haven't changed
 */
function PureUpdateDocumentToolUI({
  part,
  isReadonly = false,
}: UpdateDocumentToolUIProps) {
  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        Error updating document: {String(part.output.error)}
      </div>
    );
  }

  // Render in div wrapper matching original behavior
  return (
    <div className="relative">
      <DocumentPreview
        args={{ ...part.output, isUpdate: true }}
        isReadonly={isReadonly}
        result={part.output}
      />
    </div>
  );
}

export const UpdateDocumentToolUI = memo(
  PureUpdateDocumentToolUI,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

UpdateDocumentToolUI.displayName = "UpdateDocumentToolUI";
