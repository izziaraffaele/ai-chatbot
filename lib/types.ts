import type { AgentDataPart } from "@mastra/ai-sdk";
import type {
  DeepPartial,
  InferUITool,
  ProviderMetadata,
  Tool,
  ToolUIPart,
  UIMessage,
  UITool,
} from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifacts";
import type { ChatAgentTools } from "@/mastra/agents";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string().optional(),
  // if present, the message is supposed to be forwarded to a specific sub-agent
  forwardTo: z.string().optional(),
  // if present, in contains id of sub-agents mentioned in the message
  mentions: z.array(z.string()).optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatTools = ChatAgentTools;
export type ChatToolPart = ToolUIPart<ChatTools>;
export type ChatToolInvocation = {
  [K in keyof ChatTools]: UIToolInvocation<ChatTools[K]>;
};

export type ChatDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
  // mastra-specific
  "tool-agent": AgentDataPart["data"];
};

export type ChatMessage = UIMessage<MessageMetadata, ChatDataTypes, ChatTools>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

/**
 * Generic Activity type for typed activity configurations (legacy)
 */
export type ActivityType<T extends string, P> = {
  /** Activity type identifier */
  type: T;
  /** Activity-specific payload data */
  payload: P;
  /** Optional title for the activity */
  title?: string;
  /** Optional description for the activity */
  description?: string;
  /** Optional activity ID */
  id?: string;
  /** Optional difficulty level */
  difficulty?: "easy" | "medium" | "hard";
  /** Optional learning objectives */
  objectives?: string[];
};

/**
 * UI Activity type - for frontend components and user interactions
 */
export type UIActivity<T extends string, P> = {
  /** activity ID */
  id: string;
  /** Activity type identifier */
  type: T;
  /** Activity-specific payload data */
  payload: P;
  /** Optional title for the activity */
  title: string;
  /** Optional description for the activity */
  description?: string;
  /** Optional difficulty level */
  difficulty?: "easy" | "medium" | "hard";
  /** Optional learning objectives */
  objectives: string[];
};

/**
 * Model Activity type - for AI model generation with minimal required fields
 */
export type ModelActivity<T extends string, P> = {
  /** Auto-generated activity ID if not provided */
  id?: string;
  type: T;
  payload: P;
  title: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  objectives?: string[];
};

type asUITool<TOOL extends UITool | Tool> = TOOL extends Tool
  ? InferUITool<TOOL>
  : TOOL;

type UIToolInvocation<TOOL extends UITool | Tool> = {
  /**
   * ID of the tool call.
   */
  toolCallId: string;
  title?: string;

  /**
   * Whether the tool call was executed by the provider.
   */
  providerExecuted?: boolean;
} & (
  | {
      state: "input-streaming";
      input: DeepPartial<asUITool<TOOL>["input"]> | undefined;
      output?: never;
      errorText?: never;
      approval?: never;
    }
  | {
      state: "input-available";
      input: asUITool<TOOL>["input"];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval?: never;
    }
  | {
      state: "approval-requested";
      input: asUITool<TOOL>["input"];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved?: never;
        reason?: never;
      };
    }
  | {
      state: "approval-responded";
      input: asUITool<TOOL>["input"];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: boolean;
        reason?: string;
      };
    }
  | {
      state: "output-available";
      input: asUITool<TOOL>["input"];
      output: asUITool<TOOL>["output"];
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      preliminary?: boolean;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: "output-error"; // TODO AI SDK 6: change to 'error' state
      input: asUITool<TOOL>["input"] | undefined;
      rawInput?: unknown; // TODO AI SDK 6: remove this field, input should be unknown
      output?: never;
      errorText: string;
      callProviderMetadata?: ProviderMetadata;
      approval?: {
        id: string;
        approved: true;
        reason?: string;
      };
    }
  | {
      state: "output-denied";
      input: asUITool<TOOL>["input"];
      output?: never;
      errorText?: never;
      callProviderMetadata?: ProviderMetadata;
      approval: {
        id: string;
        approved: false;
        reason?: string;
      };
    }
);
