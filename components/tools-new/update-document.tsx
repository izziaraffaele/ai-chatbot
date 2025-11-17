"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import { DocumentPreview } from "@/components/document-preview";
import type { InferToolUIComponentProps } from "../tools/types";

export type UpdateDocumentProps =
  InferToolUIComponentProps<"tool-updateDocument">;

/**
 * Update Document Tool UI Component
 * Displays document update tool invocations with updated document preview
 */
function PureUpdateDocument({
  part,
  isReadonly = false,
}: UpdateDocumentProps) {
  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        Error updating document: {String(part.output.error)}
      </div>
    );
  }

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

export const UpdateDocument = memo(
  PureUpdateDocument,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

UpdateDocument.displayName = "UpdateDocument";
