"use client";

import type { LLMStepResult } from "@mastra/core/agent";
import type { DataUIPart } from "ai";
import equal from "fast-deep-equal";
import { MessageSquareShareIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import { getAgentConfigByRegistryId } from "@/lib/ai/agent-config";
import type { ChatDataTypes } from "@/lib/types";
import { cn, getAgentToolName, isAgentToolUIPart } from "@/lib/utils";
import { ChatAvatar } from "../chat/avatar";
import { useDataStream } from "../chat/streaming";
import { MessageResponse } from "../elements/message";
import { Shimmer } from "../elements/shimmer";
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
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.isLastPart === nextProps.isLastPart &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

Fallback.displayName = "Fallback";

/**
 * Agent Tool UI Component
 * Displays agent execution status and content for agent- tools
 */
function FallbackAgent({ part, isStreaming, isLastPart }: FallbackProps) {
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

  const isPartStreaming = isStreaming && isLastPart;
  const isRunning = isPartStreaming && !stepResult?.finishReason;

  const agentId = getAgentToolName(part);
  const agentConfig = getAgentConfigByRegistryId(agentId);
  const agentDisplayName = agentConfig?.name || agentId;
  const agentDisplayAvatar = (
    <ChatAvatar
      className="size-full"
      for="assistant"
      profile={{ displayName: agentDisplayName }}
    />
  );

  const displayText = String(part.output?.text || stepResult?.text || "");

  const hasSources = stepResult?.sources && stepResult.sources.length > 0;
  const hasContent = displayText && displayText.trim().length > 0;

  const title = isRunning ? (
    part.input?.prompt ? (
      <Shimmer>{part.input.prompt}</Shimmer>
    ) : null
  ) : (
    part.input?.prompt
  );

  return (
    <Tool
      className="mb-0 rounded-none border-none"
      data-slot="chat-fallback-agent-tool"
    >
      <ToolHeader
        className="rounded-md border data-[state=open]:bg-secondary [&>div]:w-full [&_span]:grow"
        icon={MessageSquareShareIcon}
        state={part.state}
        statusBadge={() => (
          <div
            className={cn("size-4", {
              "opacity-90": isRunning,
            })}
          >
            {agentDisplayAvatar}
          </div>
        )}
        title={title}
        type={part.type}
      />
      <ToolContent>
        <div className="my-2 overflow-hidden rounded-md border border-border text-sm">
          {/* <div className="sticky top-0 flex items-center gap-2 bg-background p-4"> */}
          <div className="flex items-center gap-3 bg-secondary p-3 font-semibold text-xs">
            <div className="size-6">{agentDisplayAvatar}</div>
            <div>{agentDisplayName}</div>
          </div>
          <div className="max-h-90 space-y-6 overflow-y-auto p-4">
            {hasContent && (
              <MessageResponse className="[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base">
                {displayText}
              </MessageResponse>
            )}
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
        </div>
      </ToolContent>
    </Tool>
  );
}

const DebugDetails = (props: { data?: any }) => {
  return (
    <Sources>
      <SourcesTrigger asChild count={0}>
        <div className="font-mono text-muted-foreground text-xs">
          Debug Info
        </div>
      </SourcesTrigger>
      <SourcesContent>
        <pre className="mt-2 overflow-auto rounded-md bg-muted p-2">
          {JSON.stringify(props.data, null, 2)}
        </pre>
      </SourcesContent>
    </Sources>
  );
};
