"use client";

import type { ReasoningUIPart, TextUIPart, ToolUIPart } from "ai";
import {
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from "@/components/elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import type { ChatMessageMode } from "./message";

// ============================================================================
// Part Renderers
// ============================================================================

type ChatMessageTextPartProps = {
  part: TextUIPart;
  mode?: ChatMessageMode;
};

const ChatMessageTextPart = ({
  part,
  mode = "view",
}: ChatMessageTextPartProps) => {
  const text = part.text.trim();

  if (!text.length || mode === "edit") {
    return null;
  }

  return (
    <MessageContent
      className={cn(
        "group-[.is-user]:wrap-break-words group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:px-3! group-[.is-user]:py-2! group-[.is-user]:text-primary-foreground"
      )}
      data-slot="chat-message-text"
    >
      <MessageResponse>{sanitizeText(part.text)}</MessageResponse>
    </MessageContent>
  );
};

type ChatMessageReasoningPartProps = {
  part: ReasoningUIPart;
  isStreaming?: boolean;
};

const ChatMessageReasoningPart = ({
  part,
  isStreaming: isStreamingProp,
}: ChatMessageReasoningPartProps) => {
  const isStreaming = isStreamingProp === true || part.state === "streaming";
  const text = part.text.trim();

  if (!text.length) {
    return null;
  }

  return (
    <Reasoning
      className="w-full"
      data-slot="chat-message-reasoning"
      isStreaming={isStreaming}
    >
      <ReasoningTrigger />
      <ReasoningContent>{text}</ReasoningContent>
    </Reasoning>
  );
};

type ChatMessageToolPartProps = {
  part: ToolUIPart;
};

/**
 * Default/fallback tool UI renderer.
 * For custom tool UI, use the MessagePartIterator render function instead.
 */
const ChatMessageToolPart = ({ part }: ChatMessageToolPartProps) => {
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
};

type ChatMessageAttachmentsPartProps = {
  parts: ChatMessageType["parts"];
};

const ChatMessageAttachmentsPart = ({
  parts,
}: ChatMessageAttachmentsPartProps) => {
  const fileParts = parts.filter((p) => p.type === "file");

  if (fileParts.length === 0) {
    return null;
  }

  return (
    <MessageAttachments className="mb-2">
      {fileParts.map((part) => (
        <MessageAttachment data={part} key={part.url} />
      ))}
    </MessageAttachments>
  );
};

export const ChatMessagePart = {
  Text: ChatMessageTextPart,
  Reasoning: ChatMessageReasoningPart,
  Tool: ChatMessageToolPart,
  Attachments: ChatMessageAttachmentsPart,
};
