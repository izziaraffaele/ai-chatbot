import type { UseChatHelpers } from "@ai-sdk/react";
import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { getAvailableAgents } from "@/lib/ai/agent-config";
import { useTranslations } from "@/lib/i18n/use-translations";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon } from "../icons";

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
  const t = useTranslations();
  const availableAgents = useMemo(() => {
    return getAvailableAgents();
  }, []);

  const displayAgent = useMemo(() => {
    if (!selectedAgent) {
      return placeholder || t("agent.selector.placeholder", "Assistant");
    }
    const translationKey = `agent.${selectedAgent.id}.name` as any;
    return t(translationKey, selectedAgent.name);
  }, [selectedAgent, placeholder, t]);

  const isDisabled = disabled || status === "streaming";

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          className={cn("justify-between md:h-[34px] md:px-2", className)}
          data-testid="agent-selector"
          disabled={isDisabled}
          variant="outline"
        >
          <div className="flex items-center gap-2">
            {selectedAgent?.avatar && (
              <span className="text-base">{selectedAgent.avatar}</span>
            )}
            <ModelSelectorName>{displayAgent}</ModelSelectorName>
          </div>
          <ChevronDownIcon />
        </Button>
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
              const agentName = t(`agent.${agent.id}.name` as any, agent.name);
              const agentDescription = t(
                `agent.${agent.id}.description` as any,
                agent.description
              );

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
                    <ModelSelectorName>{agentName}</ModelSelectorName>
                    <div className="line-clamp-2 text-muted-foreground text-xs">
                      {agentDescription}
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
