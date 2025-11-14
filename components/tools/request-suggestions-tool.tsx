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
import type { InferToolUIComponentProps } from "./types";

export type RequestSuggestionsToolUIProps =
  InferToolUIComponentProps<"tool-requestSuggestions">;

/**
 * RequestSuggestionsToolUI Component
 * Displays suggestion request tool invocations with document ID input and suggestion results
 * Memoized to prevent re-renders when part or isReadonly props haven't changed
 */
function PureRequestSuggestionsToolUI({
  part,
  isReadonly = false,
}: RequestSuggestionsToolUIProps) {
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

export const RequestSuggestionsToolUI = memo(
  PureRequestSuggestionsToolUI,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

RequestSuggestionsToolUI.displayName = "RequestSuggestionsToolUI";
