import type { ToolUIPart } from "ai";
import type { ChatAgentTools } from "@/mastra/agents";

/**
 * Union type of all tool part types
 * Represents any tool invocation that can be rendered by the tool UI system
 */
export type ChatAgentToolUIPart = ToolUIPart<ChatAgentTools>;

/**
 * Common props for tool UI components
 * @template T - The tool type
 */
export type ToolUIComponentProps = {
  /** The tool part containing input, output, and state information */
  part: ChatAgentToolUIPart;
  /** Whether the message/tool is in read-only mode. Disables interactive elements when true. */
  isReadonly?: boolean;
  /** Optional CSS class name for custom styling */
  className?: string;
};

export type InferToolUIComponentProps<K extends string> =
  ToolUIComponentProps & { part: Extract<ChatAgentToolUIPart, { type: K }> };
