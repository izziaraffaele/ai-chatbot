"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import React, { type FormEvent, useCallback, useEffect, useRef } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { useChatRuntime } from "@/components/chat/context";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/elements/prompt-input";
import { useSelectedAgent } from "@/hooks/use-selected-agent";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatAgentSelector } from "./agent-selector";
import { ChatContextUsage } from "./usage";

/**
 * ChatComposer
 * Container for chat input area with consistent spacing and positioning
 */
export type ChatComposerProps = React.ComponentProps<"div">;

export function ChatComposer({
  className,
  children,
  ...others
}: ChatComposerProps) {
  return (
    <div
      className={cn(
        "z-1 mx-auto flex w-full max-w-4xl shrink-0 gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4",
        className
      )}
      data-slot="chat-composer"
      {...others}
    >
      {children}
    </div>
  );
}

/**
 * useChatComposer Hook
 * Centralizes chat composer logic by combining:
 * - Chat runtime (useChatRuntime)
 * - Chat helpers (useChat)
 * - Prompt input controller (usePromptInputController)
 * - Local storage persistence
 * - Form submission logic
 */
export function useChatComposer() {
  const runtime = useChatRuntime();
  const chat = useChat({ chat: runtime.chat });
  const composer = usePromptInputController();
  const { width } = useWindowSize();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  const inputValue = composer.textInput.value;

  // Hydrate input from localStorage
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      composer.textInput.setInput(finalValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer.textInput.setInput, localStorageInput]);

  // Persist input to localStorage
  useEffect(() => {
    setLocalStorageInput(inputValue);
  }, [setLocalStorageInput, inputValue]);

  const submitForm = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      chat.sendMessage({
        text: message.text || "Sent with attachments",
        files: message.files,
      });

      composer.textInput.setInput("");
      composer.attachments.clear();

      window.history.pushState({}, "", `/chat/${chat.id}`);

      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    },
    [chat, width, composer]
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage, event: FormEvent) => {
      event.preventDefault();

      if (chat.status === "ready") {
        submitForm(message);
        return;
      }

      if (chat.status !== "error") {
        chat.stop();
      }
    },
    [submitForm, chat]
  );

  return {
    /** Chat ID from the current chat session */
    chatId: chat.id,
    /** Current chat status ('ready', 'streaming', 'error') */
    status: chat.status,
    /** Function to send a message to the chat */
    sendMessage: chat.sendMessage,
    /** Function to stop the current streaming response */
    stop: chat.stop,

    /** Prompt input controller with text and attachment state */
    composer,
    /** Current input text value from the textarea */
    inputValue,
    /** Ref to the textarea element for focus control */
    textareaRef,
    /** Array of attached files */

    /** Form submission handler that prevents default and sends/stops chat */
    handleSubmit,
    /** Core form submission logic that handles message sending */
    submitForm,
  };
}

/**
 * ChatInput
 * Runtime-aware input component using useChatComposer hook
 */
export type ChatInputProps = {
  /**
   * Placeholder text for the textarea
   */
  placeholder?: string;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Additional className for the wrapper
   */
  className?: string;
  /**
   * Whether to enable global drop for attachments
   */
  globalDrop?: boolean;
  /**
   * Whether to allow multiple attachments
   */
  multiple?: boolean;
  /**
   * Render prop for header content (before textarea)
   */
  header?: React.ReactNode;
  /**
   * Render prop for tools (left side of footer)
   */
  tools?: React.ReactNode;
  /**
   * Render prop for actions (right side of footer)
   * Receives chat status and input value for conditional rendering
   */
  actions?:
    | React.ReactNode
    | ((props: {
        status: UseChatHelpers<ChatMessage>["status"];
        hasInput: boolean;
        disabled?: boolean;
      }) => React.ReactNode);
};

export function ChatInput({
  placeholder = "Send a message...",
  disabled,
  className,
  globalDrop = true,
  multiple = true,
  header,
  tools,
  actions = null,
}: ChatInputProps) {
  const { status, inputValue, textareaRef, handleSubmit } = useChatComposer();

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      <PromptInput
        globalDrop={globalDrop}
        multiple={multiple}
        onSubmit={handleSubmit}
      >
        {header && <PromptInputHeader>{header}</PromptInputHeader>}

        <PromptInputBody className="max-h-[200px] min-h-11">
          <PromptInputTextarea
            autoFocus
            className="px-5 pt-0 pb-5"
            disabled={disabled}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={inputValue}
          />
        </PromptInputBody>

        <PromptInputFooter>
          {tools && <PromptInputTools>{tools}</PromptInputTools>}
          {typeof actions === "function"
            ? actions({
                status,
                hasInput: Boolean(inputValue),
                disabled,
              })
            : actions}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

/**
 * ChatComposerTool Namespace
 * Common tools for the composer (left side of footer)
 * Similar to ChatMessageAction namespace pattern
 */

const ChatComposerToolAttachmentMenu = () => (
  <PromptInputActionMenu>
    <PromptInputActionMenuTrigger />
    <PromptInputActionMenuContent>
      <PromptInputActionAddAttachments />
    </PromptInputActionMenuContent>
  </PromptInputActionMenu>
);

const ChatComposerToolAgentSelector = () => {
  const { selectedAgent, setSelectedAgent } = useSelectedAgent();
  const { status } = useChatComposer();
  return (
    <ChatAgentSelector
      onAgentChange={setSelectedAgent}
      selectedAgent={selectedAgent}
      status={status}
    />
  );
};

export const ChatComposerTool = {
  AttachmentMenu: ChatComposerToolAttachmentMenu,
  AgentSelector: ChatComposerToolAgentSelector,
  ContextUsage: ChatContextUsage,
};

/**
 * ChatComposerAction Namespace
 * Common actions for the composer (right side of footer)
 */
/**
 * PromptInputSubmitSpeech
 * Speech button that also acts as a submit button
 * Useful for voice-first input modes
 */
const ComposerInputSpeechButton = ({
  onTranscriptionChange,
  ...others
}: React.ComponentProps<typeof PromptInputSpeechButton>) => {
  const { textInput } = usePromptInputController();

  const handleTranscriptionChange = useCallback(
    (text: string) => {
      textInput.setInput(text);
      onTranscriptionChange?.(text);
    },
    [textInput, onTranscriptionChange]
  );

  return (
    <PromptInputSpeechButton
      {...others}
      onTranscriptionChange={handleTranscriptionChange}
    />
  );
};

export const ChatComposerAction = {
  Submit: PromptInputSubmit,
  Speech: ComposerInputSpeechButton,
};
