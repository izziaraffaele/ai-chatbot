"use client";

import type { LLMStepResult } from "@mastra/core/agent";
import type { DataUIPart } from "ai";
import equal from "fast-deep-equal";
import { BotIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatDataTypes } from "@/lib/types";
import { getAgentToolName, isAgentToolUIPart } from "@/lib/utils";
import { useDataStream } from "../chat/streaming";
import { MessageResponse } from "../elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "../elements/sources";
import type { ChatToolProps } from "../tools/types";

export type FallbackProps = ChatToolProps;

/**
 * Fallback Tool UI Component
 * Displays a default tool UI with input and output when a dedicated tool UI is not available
 */
function PureFallback(props: FallbackProps) {
  const { part } = props;

  if (isAgentToolUIPart(part)) {
    return <FallbackAgent {...props} />;
  }

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

/**
 * Agent Tool UI Component
 * Displays agent execution status and content for agent- tools
 */
function FallbackAgent({
  part,
  // isStreaming
}: FallbackProps) {
  const streamingStepResultRef = useRef<LLMStepResult>(undefined);
  const stepResult = streamingStepResultRef.current;

  const { subscribe } = useDataStream();
  useEffect(() => {
    const handleDataPart = (p: DataUIPart<ChatDataTypes>) => {
      if (p.type === "data-tool-agent") {
        streamingStepResultRef.current = p.data;
      }
    };
    return subscribe(handleDataPart);
  }, [subscribe]);

  // const isRunning =
  //   status === "running" || (isStreaming && !agentDataRef.current.finishReason);

  const agentId = getAgentToolName(part);
  const displayText = String(part.output?.text || stepResult?.text || "");

  const hasSources = stepResult?.sources && stepResult.sources.length > 0;
  const hasContent = displayText && displayText.trim().length > 0;

  const fontScale = 1;
  return (
    <Tool data-slot="chat-fallback-agent-tool">
      <ToolHeader
        icon={BotIcon}
        state={part.state}
        title={agentId}
        type={part.type}
      />
      <ToolContent
        className="space-y-6 p-4"
        style={
          {
            fontSize: `calc(var(--text-base) * ${fontScale})`,
            "--text-xs": `calc(var(--text-xs) * ${fontScale})`,
            "--text-sm": `calc(var(--text-sm) * ${fontScale})`,
            "--text-lg": `calc(var(--text-lg) * ${fontScale})`,
            "--text-xl": `calc(var(--text-xl) * ${fontScale})`,
            "--text-2xl": `calc(var(--text-2xl) * ${fontScale})`,
            "--text-3xl": `calc(var(--text-3xl) * ${fontScale})`,
            "--text-4xl": `calc(var(--text-4xl) * ${fontScale})`,
            "--text-5xl": `calc(var(--text-5xl) * ${fontScale})`,
          } as React.CSSProperties
        }
      >
        {hasContent && <MessageResponse>{displayText}</MessageResponse>}
        <div className="relative">
          {stepResult && hasSources && (
            <Sources>
              <SourcesTrigger count={stepResult.sources.length} />
              <SourcesContent>
                {stepResult.sources.map((source: any) => (
                  <Source
                    href={source.href}
                    key={source.href}
                    title={source.title}
                  />
                ))}
              </SourcesContent>
            </Sources>
          )}

          {process.env.NODE_ENV === "development" && stepResult && (
            <DebugDetails data={stepResult} />
          )}
        </div>
      </ToolContent>
    </Tool>
  );
}

const DebugDetails = (props: { data?: any }) => {
  return (
    <Sources>
      <SourcesTrigger count={0}>Debug Info</SourcesTrigger>
      <SourcesContent>
        <pre className="mt-2 overflow-auto rounded-md bg-muted p-2">
          {JSON.stringify(props.data, null, 2)}
        </pre>
      </SourcesContent>
    </Sources>
  );
};
