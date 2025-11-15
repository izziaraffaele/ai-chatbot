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
import type { InferToolUIComponentProps } from "./types";

export type FallbackToolUIProps = Omit<
  InferToolUIComponentProps<any>,
  "part"
> & {
  part: ToolUIPart;
};

/**
 * FallbackToolUI Component
 * Displays a default tool UI with input and output to use when a dedicacated
 * tool UI is not needed
 */
function PureFallbackToolUI({ part }: FallbackToolUIProps) {
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

export const FallbackToolUI = memo(
  PureFallbackToolUI,
  (prevProps, nextProps) => {
    return (
      equal(prevProps.part, nextProps.part) &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
);

FallbackToolUI.displayName = "FallbackToolUI";
