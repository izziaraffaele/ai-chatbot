import { Resolver, useForm, UseFormReturn } from 'react-hook-form';
import { Form } from '../ui/form';
import React, { useEffect } from 'react';
import { useDemoConfig } from '@/hooks/use-demo-config';
import { DemoConfig, DemoConfigSchema } from '@/config/demo.schema';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemMedia,
} from '@/components/ui/item';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';
import { ChevronLeftIcon } from 'lucide-react';

export const demoConfigFormResolver = zodResolver(
  DemoConfigSchema
) as Resolver<DemoConfig>;

export const DemoConfigForm = (props: React.PropsWithChildren) => {
  const { value: demoConfig, setValue: setDemoConfig } = useDemoConfig();

  const form = useForm<DemoConfig>({
    defaultValues: demoConfig,
    resolver: demoConfigFormResolver,
  });

  const { watch, handleSubmit } = form;

  // submit on change
  useEffect(() => {
    const onSubmit = (v: DemoConfig) => {
      console.log({ submit: v });
      setDemoConfig(v);
    };

    const subscription = watch(() => handleSubmit(onSubmit)());
    return () => subscription.unsubscribe();
  }, [watch, handleSubmit]);

  return <Form {...form}>{props.children}</Form>;
};

export type UseDemoConfigForm = UseFormReturn<DemoConfig>;

export const DemoConfigFieldGroup = ({
  title,
  description,
  icon: Icon,
  className,
  children,
  ...others
}: React.ComponentProps<'button'> & {
  title?: string;
  description?: string;
  icon?: React.FC<{ className?: string }>;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Item size="sm" variant="muted" asChild className={className}>
        <button className="text-left w-full block hover:bg-accent" {...others}>
          {Icon && (
            <ItemMedia variant="icon">
              <Icon className="size-4" />
            </ItemMedia>
          )}
          <ItemContent>
            <ItemTitle>{title}</ItemTitle>
            {description && (
              <ItemDescription className="line-clamp-1 truncate">
                {description}
              </ItemDescription>
            )}
          </ItemContent>
        </button>
      </Item>
    </SheetTrigger>
    <SheetContent hideClose className="p-0 h-full flex flex-col gap-0">
      <div className="flex items-center gap-2 p-4 border-b">
        <SheetClose asChild>
          <Button
            variant="ghost"
            className="w-8 h-8 rounded-full border-border/20 backdrop-blur-sm group"
          >
            <ChevronLeftIcon size={20} />
          </Button>
        </SheetClose>
        <SheetTitle>{title}</SheetTitle>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">{children}</div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);
