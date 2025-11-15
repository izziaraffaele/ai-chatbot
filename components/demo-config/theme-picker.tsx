import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export function DemoThemePicker(
  props: React.ComponentProps<"input"> & {
    label?: React.ReactNode;
    value?: string;
    defaultValue?: string;
    options?: { label: string; primaryColor: string; value: string }[];
    onValueChange?: (value: string) => void;
  }
) {
  const {
    label,
    className,
    options = [],
    defaultValue,
    value = defaultValue,
    onChange,
    onValueChange,
    ...others
  } = props;

  const isCustom =
    value && value.length > 0 && !options.some((v) => v.value === value);

  const [isEditing, setIsEditing] = useState(false);
  const [customValue, setCustomValue] = useState(isCustom ? value || "" : "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const saveValue = (input: string) => {
    onChange?.({ target: { value: input } } as any);
    onValueChange?.(input);
  };

  const handleSaveCustom = () => {
    const newValue = customValue.trim();
    if (newValue) {
      saveValue(newValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCustomValue(isCustom ? value || "" : "");
    setIsEditing(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveCustom();
    }
  };

  if (isCustom && !isEditing) {
    return (
      <div {...others} className={cn("space-y-3", className)}>
        <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted p-3 font-mono text-xs">
          {value}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setCustomValue(value || "");
              setIsEditing(true);
            }}
            size="sm"
            variant="outline"
          >
            Edit
          </Button>
          <Button onClick={() => saveValue("")} size="sm" variant="destructive">
            Remove
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div {...others} className={cn("space-y-3", className)}>
        <Textarea
          className="min-h-[200px] resize-y font-mono text-xs"
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... add your theme variables */
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark theme variables */
  }
}`}
          ref={textareaRef}
          value={customValue}
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">
              Esc
            </kbd>{" "}
            to cancel,{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">
              Cmd+Enter
            </kbd>{" "}
            to save
          </span>
          <div className="flex gap-2">
            <Button onClick={handleCancel} size="sm" variant="ghost">
              <XIcon className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button
              disabled={!customValue.trim()}
              onClick={handleSaveCustom}
              size="sm"
            >
              <CheckIcon className="mr-1 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col px-4 pt-1 pb-3", className)} {...others}>
      <Label className="mb-3 flex w-full items-center justify-between">
        {label}
      </Label>
      <div className="grid grid-cols-4 gap-4">
        {options.map((item) => {
          const isSelected = item.value === value;
          return (
            <button
              aria-label={`Select ${item.label} theme`}
              aria-pressed={isSelected}
              className={cn(
                "group flex flex-col items-center gap-2 transition-all",
                "-m-2 rounded-lg p-2 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "scale-105"
              )}
              key={item.primaryColor}
              onClick={() => saveValue(item.value)}
              type="button"
            >
              <div
                className={cn(
                  "relative size-10 rounded-full border-2 transition-all",
                  isSelected
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border group-hover:border-primary/50"
                )}
                style={{ backgroundColor: item.primaryColor }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckIcon
                      className="h-5 w-5 text-white drop-shadow-lg"
                      strokeWidth={3}
                    />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-xs transition-colors",
                  isSelected
                    ? "font-medium text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          aria-label="Add custom theme"
          className={cn(
            "group flex flex-col items-center gap-2 transition-all",
            "-m-2 rounded-lg p-2 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          onClick={() => setIsEditing(true)}
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-muted-foreground/30 border-dashed bg-muted/50 transition-colors group-hover:border-primary/50">
            <PlusIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
          </div>
          <span className="text-muted-foreground text-xs transition-colors group-hover:text-foreground">
            Custom
          </span>
        </button>
      </div>
    </div>
  );
}
