import type { ChatToolUIPart } from "@/lib/types";

/**
 * Common props for tool UI components
 * @template T - The tool type
 */
export type ToolUIComponentProps = {
  /** The tool part containing input, output, and state information */
  part: ChatToolUIPart;
  /** Whether the message/tool is in read-only mode. Disables interactive elements when true. */
  isReadonly?: boolean;
  /** Optional CSS class name for custom styling */
  className?: string;
};

export type InferToolUIComponentProps<K extends string> =
  ToolUIComponentProps & { part: Extract<ChatToolUIPart, { type: K }> };
