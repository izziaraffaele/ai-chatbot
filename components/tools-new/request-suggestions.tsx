"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import { DocumentToolResult } from "@/components/document";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { InferToolUIComponentProps } from "../tools/types";

export type RequestSuggestionsProps =
  InferToolUIComponentProps<"tool-requestSuggestions">;

/**
 * Request Suggestions Tool UI Component
 * Displays suggestion request tool invocations with document ID input and suggestion results
 */
function PureRequestSuggestions({
  part,
  isReadonly = false,
}: RequestSuggestionsProps) {
  return (
    <Tool defaultOpen={true}>
      <ToolHeader state={part.state} type="tool-requestSuggestions" />
      <ToolContent>
        {part.state === "input-available" && <ToolInput input={part.input} />}
        {part.state === "output-available" && (
          <ToolOutput
            errorText={undefined}
            output={
              "error" in part.output ? (
                <div className="rounded border p-2 text-red-500">
                  Error: {String(part.output.error)}
                </div>
              ) : (
                <DocumentToolResult
                  isReadonly={isReadonly}
                  result={part.output}
                  type="request-suggestions"
                />
              )
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
}

export const RequestSuggestions = memo(
  PureRequestSuggestions,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

RequestSuggestions.displayName = "RequestSuggestions";
