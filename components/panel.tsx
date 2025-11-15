"use client";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export type PanelContextValue = {
  view: string;
  setView: (value: string) => void;
};

export const PanelContext = createContext<PanelContextValue>({
  view: "root",
  setView: () => {
    return;
  },
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
  const [view, setView] = useState(initialView || "root");

  const handleOpenChange = (v: boolean) => {
    if (view === "root") {
      onOpenChange?.(v);
    }

    if (!v) {
      setView("root");
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
}: React.ComponentProps<"div">) => (
  <SheetContent
    className={cn("h-full overflow-y-scroll p-0", className)}
    data-slot="panel-content"
    {...others}
  />
);

export const PanelView = ({
  className,
  value,
  ...others
}: React.ComponentProps<"div"> & { value?: string }) => {
  const { view } = usePanelContext();
  return (
    <div
      className={cn("flex h-full flex-col", className, {
        hidden: view !== value,
      })}
      data-slot="panel-view"
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
}: React.ComponentProps<"div"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <SheetHeader
    className={cn("border-b p-4", className)}
    data-slot="panel-view-header"
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
  <ScrollArea className={cn("flex-1", className)} {...others} />
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
