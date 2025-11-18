"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatToolProps } from "../tools/types";

export type FallbackProps = ChatToolProps;
/**
 * Fallback Tool UI Component
 * Displays a default tool UI with input and output when a dedicated tool UI is not available
 */
function PureFallback({ part }: FallbackProps) {
  return (
    <Tool className="mb-0" defaultOpen={false}>
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

export const Fallback = memo(PureFallback, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

Fallback.displayName = "Fallback";
