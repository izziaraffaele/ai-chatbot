import { SettingsIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import React from 'react';

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
            variant="secondary"
            className="w-10 h-10 fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ease-in-out border border-border/20 backdrop-blur-sm group"
            onClick={onClick}
            {...others}
          >
            {children || <SettingsIcon size={20} />}
          </Button>
        </SheetTrigger>
      </TooltipTrigger>
      <TooltipContent side="left" align="center">
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
}: React.ComponentProps<'div'> & { title?: React.ReactNode }) => (
  <SheetContent
    {...others}
    className={cn('h-full gap-0 p-0 flex flex-col', className)}
  >
    <SheetHeader className="p-4 border-b">
      <SheetTitle>{title}</SheetTitle>
    </SheetHeader>
    <ScrollArea className="flex-1">{children}</ScrollArea>
  </SheetContent>
);

export const DemoConfigPanel = Sheet;
