"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import React, {
  createContext,
  type FormEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useChatContext } from "@/components/chat/context";
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
} from "@/components/elements/prompt-input";
import { useSelectedAgent } from "@/hooks/use-selected-agent";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatAgentSelector } from "./agent-selector";
import { ChatContextUsage } from "./usage";

// ============================================================================
// ChatComposerProvider Context & Types
// ============================================================================

export type ChatComposerContextValue = {
  /** Textarea ref for this specific composer */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Form handling for this composer */
  submitForm: (message: PromptInputMessage, event: FormEvent) => void;
  /** Composer-specific status */
  status: UseChatHelpers<ChatMessage>["status"];
};

const ChatComposerContext = createContext<ChatComposerContextValue | null>(
  null
);

export function useChatComposerContext(): ChatComposerContextValue {
  const ctx = useContext(ChatComposerContext);
  if (!ctx) {
    throw new Error(
      "useChatComposerContext must be used within a ChatComposerProvider"
    );
  }
  return ctx;
}

export type ChatComposerProviderProps = {
  children: React.ReactNode;
  onSubmit: (message: PromptInputMessage, event: FormEvent) => void;
  status: UseChatHelpers<ChatMessage>["status"];
};

/**
 * ChatComposerProvider
 * Provides composer-specific state including textareaRef sharing and form handling.
 * Each instance manages its own textarea and form state, supporting multiple composers.
 */
export function ChatComposerProvider({
  children,
  onSubmit,
  status,
}: ChatComposerProviderProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const contextValue = useMemo<ChatComposerContextValue>(
    () => ({
      textareaRef,
      submitForm: onSubmit,
      status,
    }),
    [onSubmit, status]
  );

  return (
    <ChatComposerContext.Provider value={contextValue}>
      {children}
    </ChatComposerContext.Provider>
  );
}

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
  const { status, sendMessage } = useChatContext();

  // Create handleSubmit that integrates with global state
  const handleSubmit = useCallback(
    (message: PromptInputMessage, event: FormEvent) => {
      event.preventDefault();

      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      // Use global sendMessage from context
      sendMessage(message);
    },
    [sendMessage]
  );

  return (
    <div
      className={cn("relative flex w-full flex-col gap-4", className)}
      data-slot="chat-composer"
      {...others}
    >
      <ChatComposerProvider onSubmit={handleSubmit} status={status}>
        {children}
      </ChatComposerProvider>
    </div>
  );
}

/**
 * ChatInput
 * Runtime-aware input component using new context hooks
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

  showUsage?: boolean;
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
  showUsage = false,
}: ChatInputProps) {
  const isRenderedRef = useRef(false);
  const { inputValue, setInput } = useChatContext();
  const { textareaRef, submitForm, status } = useChatComposerContext();

  // Hydrate input
  useEffect(() => {
    if (textareaRef.current && !isRenderedRef.current) {
      isRenderedRef.current = true;
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || inputValue;
      if (finalValue !== inputValue) {
        setInput(finalValue);
      }
    }
  }, [setInput, inputValue, textareaRef.current]);

  return (
    <PromptInput
      className={cn("relative", className)}
      data-slot="chat-input"
      globalDrop={globalDrop}
      multiple={multiple}
      onSubmit={submitForm}
    >
      {header && <PromptInputHeader>{header}</PromptInputHeader>}

      <PromptInputBody className="max-h-[200px] min-h-11">
        <PromptInputTextarea
          autoFocus
          className={cn({
            "px-5 pb-5": Boolean(header),
            "px-5 py-5": !header,
          })}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
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

      {showUsage && (
        <div className="absolute top-4 right-4">
          <ChatContextUsage />
        </div>
      )}
    </PromptInput>
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
  const { status } = useChatContext();
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
  const { textareaRef } = useChatComposerContext();
  return <PromptInputSpeechButton textareaRef={textareaRef} {...others} />;
};

export const ChatComposerAction = {
  Submit: PromptInputSubmit,
  Speech: ComposerInputSpeechButton,
};
