"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import { DocumentPreview } from "@/components/document-preview";
import type { InferToolUIComponentProps } from "../tools/types";

export type CreateDocumentProps =
  InferToolUIComponentProps<"tool-createDocument">;

/**
 * Create Document Tool UI Component
 * Displays document creation tool invocations with document preview
 */
function PureCreateDocument({
  part,
  isReadonly = false,
}: CreateDocumentProps) {
  // Check if output contains an error
  if (part.output && "error" in part.output) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50">
        Error creating document: {String(part.output.error)}
      </div>
    );
  }

  return <DocumentPreview isReadonly={isReadonly} result={part.output} />;
}

export const CreateDocument = memo(
  PureCreateDocument,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

CreateDocument.displayName = "CreateDocument";
