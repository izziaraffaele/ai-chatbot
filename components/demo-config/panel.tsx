import equal from 'fast-deep-equal';
import { SettingsIcon } from 'lucide-react';
import type React from 'react';
import { demoConfig } from '@/config/demo';
import { useDemoConfig } from '@/hooks/use-demo-config';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const DEFAULT_TITLE = 'Demo Settings';

export const DemoConfigPanelTrigger = ({
  onClick,
  children,
  tooltip = DEFAULT_TITLE,
  ...others
}: React.ComponentProps<typeof Button> & { tooltip?: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <SheetTrigger asChild>
          <Button
            className="bg-[#f4f4f5ff] dark:bg-[#27272aff] text-muted-foreground group fixed right-6 bottom-6 z-50 h-10 w-10 rounded-full border border-border/20 shadow-lg backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl active:scale-95"
            onClick={onClick}
            variant="secondary"
            {...others}
          >
            {children || <SettingsIcon size={20} />}
          </Button>
        </SheetTrigger>
      </TooltipTrigger>
      <TooltipContent align="center" side="left">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const DemoConfigPanelContent = ({
  children,
  className,
  title = DEFAULT_TITLE,
  ...others
}: React.ComponentProps<'div'> & { title?: React.ReactNode }) => {
  const { value, setValue } = useDemoConfig();
  return (
    <SheetContent
      {...others}
      className={cn('flex h-full flex-col gap-0 p-0', className)}
    >
      <SheetHeader className="border-b p-4">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-1">{children}</ScrollArea>
      {!equal(value, demoConfig) && (
        <SheetFooter className="border-t p-4">
          <Button onClick={() => setValue(demoConfig)}>Reset</Button>
        </SheetFooter>
      )}
    </SheetContent>
  );
};

export const DemoConfigPanel = Sheet;
