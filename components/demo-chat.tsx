"use client";
import { useDemoConfig } from "@/hooks/use-demo-config";
import { AssistantChat, type AssistantChatProps } from "./assistant-chat";

export function DemoChat(props: AssistantChatProps) {
  const { value: config } = useDemoConfig();

  return (
    <AssistantChat
      autoApply="message"
      suggestions={config.chat.suggestions || []}
      {...props}
    />
  );
}
