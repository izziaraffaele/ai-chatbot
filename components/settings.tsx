import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from './ui/item';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export type SettingPanelConfigItem = {
  id: string;
  title: string;
  description?: string;
  icon?: React.FC<{ className?: string }>;
  items?: SettingPanelConfigItem[];
};

export const SettingPanel = Sheet;

export const SettingPanelTrigger = ({
  tooltip = 'Settings',
  ...others
}: React.ComponentProps<'button'> & { tooltip?: string }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SheetTrigger asChild>
          <Button variant="outline" {...others} />
        </SheetTrigger>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const SettingPanelContent = SheetContent;

export const SettingPanelHeader = (
  props: React.ComponentProps<'div'> & {
    title?: React.ReactNode;
    description?: React.ReactNode;
  }
) => (
  <SheetHeader>
    <SheetTitle>{props.title}</SheetTitle>
    <SheetDescription>{props.description}</SheetDescription>
  </SheetHeader>
);

export const SettingPanelItems = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => (
  <div {...props} className={cn('space-y-4', className)} />
);

export const SettingPanelItem = ({
  title,
  description,
  icon: Icon,
  items,
  onClick,
  ...others
}: React.ComponentProps<typeof Item> & SettingPanelConfigItem) => {
  return (
    <Item {...others} asChild>
      <Button>
        <ItemMedia>{Icon && <Icon className="size-5" />}</ItemMedia>
        <ItemContent>
          <ItemTitle>{title}</ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
      </Button>
    </Item>
  );
};
