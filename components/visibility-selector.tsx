"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
} from "./icons";

export type VisibilityType = "private" | "public";

export function VisibilitySelector({
  className,
  value,
  onValueChange,
  ...others
}: React.ComponentProps<typeof Button> & {
  value?: VisibilityType;
  onValueChange?: (value: VisibilityType) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch from Radix UI's dynamic IDs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic visibilities array with translations
  const visibilities = [
    {
      id: "private" as VisibilityType,
      label: t("visibility.private", "Private"),
      description: t(
        "visibility.private.description",
        "Only you can access this chat"
      ),
      icon: <LockIcon />,
    },
    {
      id: "public" as VisibilityType,
      label: t("visibility.public", "Public"),
      description: t(
        "visibility.public.description",
        "Anyone with the link can access this chat"
      ),
      icon: <GlobeIcon />,
    },
  ];

  const selectedVisibility = visibilities.find(
    (visibility) => visibility.id === value
  );

  // Return a placeholder button during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        className={cn("hidden h-8 md:flex md:h-fit md:px-2", className)}
        data-testid="visibility-selector"
        variant="outline"
        {...others}
      >
        {selectedVisibility?.icon}
        <span className="md:sr-only">{selectedVisibility?.label}</span>
        <ChevronDownIcon />
      </Button>
    );
  }

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button
          className="hidden h-8 md:flex md:h-fit md:px-2"
          data-testid="visibility-selector"
          variant="outline"
          {...others}
        >
          {selectedVisibility?.icon}
          <span className="md:sr-only">{selectedVisibility?.label}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        {visibilities.map((visibility) => (
          <DropdownMenuItem
            className="group/item flex flex-row items-center justify-between gap-4"
            data-active={visibility.id === value}
            data-testid={`visibility-selector-item-${visibility.id}`}
            key={visibility.id}
            onSelect={() => {
              onValueChange?.(visibility.id);
              setOpen(false);
            }}
          >
            <div className="flex flex-col items-start gap-1">
              {visibility.label}
              {visibility.description && (
                <div className="text-muted-foreground text-xs">
                  {visibility.description}
                </div>
              )}
            </div>
            <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
              <CheckCircleFillIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
