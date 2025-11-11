'use client';
import React, { createContext, useContext, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export type PanelContextValue = {
  view: string;
  setView: (value: string) => void;
};

export const PanelContext = createContext<PanelContextValue>({
  view: 'root',
  setView: () => {},
});

export const usePanelContext = () => useContext(PanelContext);

export type PanelProps = {
  initialView?: string;
  onViewChange?: (view: string) => void;
};

export const Panel = ({
  initialView,
  onOpenChange,
  ...others
}: React.ComponentProps<typeof Sheet> & PanelProps) => {
  const [view, setView] = useState(initialView || 'root');

  const handleOpenChange = (v: boolean) => {
    if (view === 'root') {
      onOpenChange?.(v);
    }

    if (!v) {
      setView('root');
    }
  };
  return (
    <PanelContext.Provider value={{ view, setView }} {...others}>
      <Sheet onOpenChange={handleOpenChange} {...others} />
    </PanelContext.Provider>
  );
};

export const PanelTrigger = ({
  tooltip,
  ...others
}: React.ComponentProps<typeof Button> & { tooltip?: string }) => (
  <SheetTrigger asChild>
    <Button {...others} />
  </SheetTrigger>
);

export const PanelContent = ({
  className,
  ...others
}: React.ComponentProps<'div'>) => (
  <SheetContent
    data-slot="panel-content"
    className={cn('p-0 h-full overflow-y-scroll', className)}
    {...others}
  />
);

export const PanelView = ({
  className,
  value,
  ...others
}: React.ComponentProps<'div'> & { value?: string }) => {
  const { view } = usePanelContext();
  return (
    <div
      data-slot="panel-view"
      className={cn('flex flex-col h-full', className, {
        hidden: view !== value,
      })}
      {...others}
    />
  );
};

export const PanelViewHeader = ({
  className,
  children,
  title,
  description,
  ...others
}: React.ComponentProps<'div'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <SheetHeader
    data-slot="panel-view-header"
    className={cn('p-4 border-b', className)}
    {...others}
  >
    <SheetTitle>{title}</SheetTitle>
    {description && <SheetDescription>{description}</SheetDescription>}
  </SheetHeader>
);

export const PanelViewContent = ({
  className,
  ...others
}: React.ComponentProps<typeof ScrollArea>) => (
  <ScrollArea className={cn('flex-1 ', className)} {...others} />
);

export const PanelViewLink = ({
  target,
  ...props
}: React.ComponentProps<typeof Button> & { target: string }) => {
  const { setView } = usePanelContext();

  return (
    <Button
      onClick={() => {
        setView(target);
      }}
      {...props}
    />
  );
};
