import type { ToolUIPart, UITools } from "ai";
import type { ChatToolUIPart } from "@/lib/types";

export type ChatToolUIProps<TOOLS extends UITools = any> = {
  part: ToolUIPart<TOOLS>;
  isReadonly?: boolean;
};

/**
 * Generic type utility to infer props for any Chat Tool UI component
 * Infers the tool type dynamically from the part itself
 */
export type InferChatToolUIProps<T extends ChatToolUIPart["type"]> = {
  part: Extract<ChatToolUIPart, { type: T }>;
  isReadonly?: boolean;
};

/**
 * Generic props for document-related tools (inferred dynamically)
 */
export type DocumentToolUIProps = InferChatToolUIProps<
  Extract<ChatToolUIPart, { toolCallId: `tool-${string}Document` }>
>;
