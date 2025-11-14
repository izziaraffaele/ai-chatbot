'use client';

import { useMemo, useState } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvailableAgents } from '@/lib/ai/agent-config';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function AgentSelector({
  selectedAgent,
  onAgentChange,
  status,
  className,
}: {
  selectedAgent: { id: string; name: string; description: string; avatar?: string } | undefined;
  onAgentChange: (agentId: string) => void;
  status: UseChatHelpers<ChatMessage>['status'];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const availableAgents = useMemo(() => getAvailableAgents(), []);

  const displayAgent = useMemo(() => {
    return selectedAgent ? selectedAgent.name : 'Select agent';
  }, [selectedAgent]);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className
        )}
      >
        <Button
          className="md:h-[34px] md:px-2"
          data-testid="agent-selector"
          variant="outline"
          disabled={status === 'streaming'}
        >
          {selectedAgent?.avatar && <span className="mr-2">{selectedAgent.avatar}</span>}
          {displayAgent}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[280px] max-w-[90vw] sm:min-w-[300px]"
      >
        {availableAgents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;

          return (
            <DropdownMenuItem
              asChild
              data-active={isSelected}
              data-testid={`agent-selector-item-${agent.id}`}
              key={agent.id}
              onSelect={() => {
                setOpen(false);
                onAgentChange(agent.id);
              }}
            >
              <button
                className="group/item flex w-full flex-row items-center justify-between gap-2 sm:gap-4"
                type="button"
              >
                <div className="flex flex-row items-center gap-2">
                  {agent.avatar && <span className="text-lg">{agent.avatar}</span>}
                  <div className="flex flex-col items-start gap-1">
                    <div className="text-sm sm:text-base">{agent.name}</div>
                    <div className="line-clamp-2 text-muted-foreground text-xs">
                      {agent.description}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
                  <CheckCircleFillIcon />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
