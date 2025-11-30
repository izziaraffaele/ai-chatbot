import equal from "fast-deep-equal";
import { DownloadIcon, SettingsIcon, UploadIcon } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { Action, Actions } from "@/components/elements/actions";
import { demoConfig } from "@/config/demo";
import { type DemoConfig, DemoConfigSchema } from "@/config/demo.schema";
import { useDemoConfig } from "@/hooks/use-demo-config";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const DEFAULT_TITLE = "Demo Settings";

const downloadConfig = (config: DemoConfig) => {
  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "demo-config.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const importConfig = (
  event: React.ChangeEvent<HTMLInputElement>,
  onConfigLoad: (config: DemoConfig) => void
) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const parsedConfig = JSON.parse(content);
      const validatedConfig = DemoConfigSchema.parse(parsedConfig);
      onConfigLoad(validatedConfig);
    } catch (error) {
      console.error("Invalid config file:", error);
      alert(
        "Invalid configuration file. Please check the file format and try again."
      );
    }
  };
  reader.readAsText(file);

  // Reset the input so the same file can be selected again
  event.target.value = "";
};

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
            className="group fixed right-6 bottom-6 z-50 h-10 w-10 rounded-full border border-border/20 bg-[#f4f4f5ff] text-muted-foreground shadow-lg backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl active:scale-95 dark:bg-[#27272aff]"
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
}: React.ComponentProps<"div"> & { title?: React.ReactNode }) => {
  const { value, setValue } = useDemoConfig();

  const handleDownloadConfig = useCallback(() => {
    downloadConfig(value);
  }, [value]);

  const handleImportConfig = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      importConfig(event, setValue);
    },
    [setValue]
  );

  return (
    <SheetContent
      {...others}
      className={cn("flex h-full flex-col gap-0 p-0", className)}
    >
      <SheetHeader className="border-b p-4">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-1">{children}</ScrollArea>
      <SheetFooter className="border-t p-4">
        <Actions>
          {equal(value, demoConfig) ? (
            <Action tooltip="Import configuration">
              <div className="relative">
                <input
                  accept=".json"
                  className="absolute inset-0 size-9 cursor-pointer opacity-0"
                  onChange={handleImportConfig}
                  type="file"
                />
                <UploadIcon size={16} />
              </div>
            </Action>
          ) : (
            <>
              <Action
                onClick={handleDownloadConfig}
                tooltip="Download configuration"
              >
                <DownloadIcon size={16} />
              </Action>
              <Button onClick={() => setValue(demoConfig)}>Reset</Button>
            </>
          )}
        </Actions>
      </SheetFooter>
    </SheetContent>
  );
};

export const DemoConfigPanel = Sheet;
