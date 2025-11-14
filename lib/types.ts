import type { ToolUIPart, UIMessage } from 'ai';
import { z } from 'zod';
import { ChatAgentUITools } from '@/mastra/agents';
import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';
import type { AppUsage } from './usage';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
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
