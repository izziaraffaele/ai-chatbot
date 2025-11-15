import type { ToolUIPart, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { ChatAgentUITools } from "@/mastra/agents";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  // if present, the message is supposed to be forwarded to a specific sub-agent
  forwardTo: z.string().optional(),
  // if present, in contains id of sub-agents mentioned in the message
  mentions: z.array(z.string()).optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type ChatUITools = ChatAgentUITools;
export type ChatToolUIPart = ToolUIPart<ChatUITools>;

export type CustomUIDataTypes = {
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
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatUITools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
