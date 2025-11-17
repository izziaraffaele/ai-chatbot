import type { ToolUIPart, UITools } from "ai";

export type ChatToolProps<TOOLS extends UITools = any> = {
  part: ToolUIPart<TOOLS>;
  isReadonly: boolean;
  isLastPart: boolean;
  isStreaming: boolean;
};
