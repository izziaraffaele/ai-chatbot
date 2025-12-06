import type { UseChatHelpers } from "@ai-sdk/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/elements/model-selector";
import { getAvailableAgents } from "@/lib/ai/agent-config";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon } from "../icons";

/**
 * ChatAgentSelector
 * Reusable primitive for selecting agents using ModelSelector UI from AI Elements
 */
export type ChatAgentSelectorProps = {
  /**
   * Selected agent configuration
   */
  selectedAgent:
    | { id: string; name: string; description: string; avatar?: string }
    | undefined;
  /**
   * Callback when agent changes
   */
  onAgentChange: (agentId: string) => void;
  /**
   * Chat status to determine if selector should be disabled
   */
  status?: UseChatHelpers<ChatMessage>["status"];
  /**
   * Additional className for the trigger button
   */
  className?: string;
  /**
   * Custom placeholder text when no agent is selected
   */
  placeholder?: string;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
};

export function ChatAgentSelector({
  selectedAgent,
  onAgentChange,
  status,
  className,
  placeholder,
  disabled,
}: ChatAgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations();
  const availableAgents = useMemo(() => getAvailableAgents(), []);

  // Prevent hydration mismatch from localStorage-based selectedAgent
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayAgent = useMemo(() => {
    return selectedAgent
      ? selectedAgent.name
      : placeholder || t("agent.selector.placeholder", "Assistant");
  }, [selectedAgent, placeholder, t]);

  const isDisabled = disabled || status === "streaming";

  // Use consistent values during SSR to prevent hydration mismatch
  const displayName = mounted
    ? displayAgent
    : placeholder || t("agent.selector.placeholder", "Assistant");

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-full bg-[#F5F5F5] px-3 py-1.5",
            "transition-colors hover:bg-[#EBEBEB]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          data-testid="agent-selector"
          disabled={isDisabled}
          type="button"
        >
          {/* H-FARM logo icon */}
          <span className="flex size-5 items-center justify-center overflow-hidden rounded-full">
            <img
              alt="H-FARM"
              className="h-5 w-5 object-cover"
              height={20}
              src="/images/hfarm_logo.png"
              width={20}
            />
          </span>
          <span className="text-hf-deep-blue text-sm">{displayName}</span>
          <ChevronDown className="size-4 text-hf-deep-blue/60" />
        </button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput
          placeholder={t("agent.selector.search", "Search agents...")}
        />
        <ModelSelectorList>
          <ModelSelectorEmpty>
            {t("agent.selector.empty", "No agents found.")}
          </ModelSelectorEmpty>
          <ModelSelectorGroup>
            {availableAgents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;

              return (
                <ModelSelectorItem
                  data-testid={`agent-selector-item-${agent.id}`}
                  key={agent.id}
                  onSelect={() => {
                    onAgentChange(agent.id);
                    setOpen(false);
                  }}
                  value={agent.id}
                >
                  {agent.avatar && (
                    <span className="text-lg">{agent.avatar}</span>
                  )}
                  <div className="flex flex-1 flex-col items-start gap-1">
                    <ModelSelectorName>{agent.name}</ModelSelectorName>
                    <div className="line-clamp-2 text-muted-foreground text-xs">
                      {agent.description}
                    </div>
                  </div>
                  <div className="ml-auto size-4">
                    {isSelected && <CheckCircleFillIcon />}
                  </div>
                </ModelSelectorItem>
              );
            })}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
