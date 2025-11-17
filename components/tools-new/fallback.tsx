"use client";

import type { ToolUIPart } from "ai";
import equal from "fast-deep-equal";
import { memo } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { InferToolUIComponentProps } from "../tools/types";

export type FallbackProps = Omit<
  InferToolUIComponentProps<any>,
  "part"
> & {
  part: ToolUIPart;
};

/**
 * Fallback Tool UI Component
 * Displays a default tool UI with input and output when a dedicated tool UI is not available
 */
function PureFallback({ part }: FallbackProps) {
  return (
    <Tool defaultOpen={false}>
      <ToolHeader state={part.state} type={part.type} />
      <ToolContent>
        {part.state === "input-available" && <ToolInput input={part.input} />}
        {part.state === "output-available" && Boolean(part.output) && (
          <ToolOutput
            errorText={undefined}
            output={JSON.stringify(part.output)}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

export const Fallback = memo(
  PureFallback,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

Fallback.displayName = "Fallback";
