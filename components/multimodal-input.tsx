"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  type FormEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { AgentSelector } from "@/components/agent-selector";
import { useChatUsage } from "@/hooks/use-chat-usage";
import { useSelectedAgent } from "@/hooks/use-selected-agent";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Context } from "./elements/context";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
  useProviderAttachments,
} from "./elements/prompt-input";
import { SuggestedActions } from "./suggested-actions";

function PureMultimodalInput({
  chatId,
  status,
  showSuggestion = true,
  disabled,
  stop,
  sendMessage,
  className,
}: {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  showSuggestion?: boolean;
  disabled?: boolean;
  stop: () => void;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
}) {
  const t = useTranslations();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  const composer = usePromptInputController();
  const usage = useChatUsage({ chatId });

  const { selectedAgent, setSelectedAgent } = useSelectedAgent();
  const { files } = useProviderAttachments();

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  const inputValue = composer.textInput.value;

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      composer.textInput.setInput(finalValue);
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer.textInput.setInput, localStorageInput]);

  useEffect(() => {
    setLocalStorageInput(inputValue);
  }, [setLocalStorageInput, inputValue]);

  const [uploadQueue, _setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      // skip if message is empty
      if (!(hasText || hasAttachments)) {
        return;
      }

      sendMessage({
        text: message.text || "Sent with attachments",
        files: message.files,
      });
      composer.textInput.setInput("");
      composer.attachments.clear();

      window.history.pushState({}, "", `/chat/${chatId}`);

      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    },
    [
      sendMessage,
      width,
      chatId,
      composer.attachments.clear,
      composer.textInput.setInput,
    ]
  );

  // const uploadFile = useCallback(async (file: File) => {
  //   const formData = new FormData();
  //   formData.append('file', file);

  //   try {
  //     const response = await fetch('/api/files/upload', {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       const { url, pathname, contentType } = data;

  //       return {
  //         url,
  //         name: pathname,
  //         contentType,
  //       };
  //     }
  //     const { error } = await response.json();
  //     toast.error(error);
  //   } catch (_error) {
  //     toast.error(
  //       t('errors.fileUploadFailed', 'Failed to upload file, please try again!')
  //     );
  //   }
  // }, []);

  // const handleFileChange = useCallback(
  //   async (event: ChangeEvent<HTMLInputElement>) => {
  //     const files = Array.from(event.target.files || []);

  //     setUploadQueue(files.map((file) => file.name));

  //     try {
  //       const uploadPromises = files.map((file) => uploadFile(file));
  //       const uploadedAttachments = await Promise.all(uploadPromises);
  //       const successfullyUploadedAttachments = uploadedAttachments.filter(
  //         (attachment) => attachment !== undefined
  //       );

  //       composer.attachments
  //       setAttachments((currentAttachments) => [
  //         ...currentAttachments,
  //         ...successfullyUploadedAttachments,
  //       ]);
  //     } catch (error) {
  //       console.error('Error uploading files!', error);
  //     } finally {
  //       setUploadQueue([]);
  //     }
  //   },
  //   [setAttachments, uploadFile]
  // );

  // const handlePaste = useCallback(
  //   async (event: ClipboardEvent) => {
  //     const items = event.clipboardData?.items;
  //     if (!items) return;

  //     const imageItems = Array.from(items).filter((item) =>
  //       item.type.startsWith('image/')
  //     );

  //     if (imageItems.length === 0) return;

  //     // Prevent default paste behavior for images
  //     event.preventDefault();

  //     setUploadQueue((prev) => [...prev, 'Pasted image']);

  //     try {
  //       const uploadPromises = imageItems.map(async (item) => {
  //         const file = item.getAsFile();
  //         if (!file) return;
  //         return uploadFile(file);
  //       });

  //       const uploadedAttachments = await Promise.all(uploadPromises);
  //       const successfullyUploadedAttachments = uploadedAttachments.filter(
  //         (attachment) =>
  //           attachment !== undefined &&
  //           attachment.url !== undefined &&
  //           attachment.contentType !== undefined
  //       );

  //       setAttachments((curr) => [
  //         ...curr,
  //         ...(successfullyUploadedAttachments as Attachment[]),
  //       ]);
  //     } catch (error) {
  //       console.error('Error uploading pasted images:', error);
  //       toast.error(
  //         t('errors.fileUploadFailed', 'Failed to upload pasted image(s)')
  //       );
  //     } finally {
  //       setUploadQueue([]);
  //     }
  //   },
  //   [setAttachments]
  // );

  // Add paste event listener to textarea

  // useEffect(() => {
  //   const textarea = textareaRef.current;
  //   if (!textarea) return;

  //   textarea.addEventListener('paste', handlePaste);
  //   return () => textarea.removeEventListener('paste', handlePaste);
  // }, [handlePaste]);

  const handleSubmitForm = useCallback(
    (message: PromptInputMessage, event: FormEvent) => {
      event.preventDefault();

      if (status === "ready") {
        submitForm(message);
        return;
      }

      if (status !== "error") {
        stop();
      }
    },
    [submitForm, stop, status]
  );

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {showSuggestion && files.length === 0 && uploadQueue.length === 0 && (
        <SuggestedActions chatId={chatId} sendMessage={sendMessage} />
      )}

      <PromptInput
        className="rounded-xl border border-border bg-background p-3 shadow-xs transition-all duration-200 focus-within:border-border hover:border-muted-foreground/50"
        globalDrop
        multiple
        onSubmit={handleSubmitForm}
      >
        <PromptInputHeader className="flex flex-row items-end gap-2 overflow-x-scroll">
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>
        <PromptInputBody className="flex flex-row items-start gap-1 sm:gap-2">
          <PromptInputTextarea
            autoFocus
            className="max-h-[200px] min-h-11"
            disabled={disabled}
            placeholder={t("chat.input.placeholder", "Send a message...")}
            ref={textareaRef}
            rows={1}
            value={inputValue}
          />
          <Context {...usage} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools className="gap-0 sm:gap-0.5">
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <AgentSelector
              onAgentChange={setSelectedAgent}
              selectedAgent={selectedAgent}
              status={status}
            />
          </PromptInputTools>

          <PromptInputSubmit
            disabled={disabled || (!inputValue && !status)}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }

    return true;
  }
);
