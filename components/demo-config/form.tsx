import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeftIcon } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { type Resolver, type UseFormReturn, useForm } from "react-hook-form";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type DemoConfig, DemoConfigSchema } from "@/config/demo.schema";
import { useDemoConfig } from "@/hooks/use-demo-config";
import { Button } from "../ui/button";
import { Form } from "../ui/form";

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
      console.log("[KB Debug] Form submitting, knowledgeBase:", v.context?.knowledgeBase);
      setDemoConfig(v);
    };

    const subscription = watch(() => handleSubmit(onSubmit)());
    return () => subscription.unsubscribe();
  }, [watch, handleSubmit, setDemoConfig]);

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
}: React.ComponentProps<"button"> & {
  title?: string;
  description?: string;
  icon?: React.FC<{ className?: string }>;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Item asChild className={className} size="sm" variant="muted">
        <button className="block w-full text-left hover:bg-accent" {...others}>
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
    <SheetContent className="flex h-full flex-col gap-0 p-0" hideClose>
      <div className="flex items-center gap-2 border-b p-4">
        <SheetClose asChild>
          <Button
            className="group h-8 w-8 rounded-full border-border/20 backdrop-blur-sm"
            variant="ghost"
          >
            <ChevronLeftIcon size={20} />
          </Button>
        </SheetClose>
        <SheetTitle>{title}</SheetTitle>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">{children}</div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);
