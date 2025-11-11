import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Label } from '../ui/label';
import { PlusIcon, CheckIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { FormField } from '../ui/form';

export function DemoThemePicker(
  props: React.ComponentProps<'input'> & {
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
    onChange = () => {},
    onValueChange = () => {},
    ...others
  } = props;

  console.log(value);

  const isCustom =
    value && value.length > 0 && !options.some((v) => v.value === value);

  const [isEditing, setIsEditing] = useState(false);
  const [customValue, setCustomValue] = useState(isCustom ? value || '' : '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const saveValue = (input: string) => {
    onChange({ target: { value: input } } as any);
    onValueChange(input);
  };

  const handleSaveCustom = () => {
    const newValue = customValue.trim();
    if (newValue) {
      saveValue(newValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setCustomValue(isCustom ? value || '' : '');
    setIsEditing(false);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveCustom();
    }
  };

  if (isCustom && !isEditing) {
    return (
      <div {...others} className={cn('space-y-3', className)}>
        <div className="font-mono text-xs bg-muted rounded-lg p-3 max-h-32 overflow-y-auto border">
          {value}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomValue(value || '');
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => saveValue('')}>
            Remove
          </Button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div {...others} className={cn('space-y-3', className)}>
        <Textarea
          ref={textareaRef}
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono text-xs min-h-[200px] resize-y"
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
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">
              Esc
            </kbd>{' '}
            to cancel,{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">
              Cmd+Enter
            </kbd>{' '}
            to save
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <XIcon className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCustom}
              disabled={!customValue.trim()}
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col px-4 pb-3 pt-1', className)} {...others}>
      <Label className="flex items-center justify-between w-full mb-3">
        {label}
      </Label>
      <div className="grid grid-cols-4 gap-4">
        {options.map((item) => {
          const isSelected = item.value === value;
          return (
            <button
              key={item.primaryColor}
              onClick={() => saveValue(item.value)}
              className={cn(
                'flex flex-col items-center gap-2 group transition-all',
                'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-2 -m-2',
                isSelected && 'scale-105'
              )}
              aria-label={`Select ${item.label} theme`}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  'size-10 rounded-full border-2 transition-all relative',
                  isSelected
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-border group-hover:border-primary/50'
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
                  'text-xs transition-colors',
                  isSelected
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex flex-col items-center gap-2 group transition-all',
            'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg p-2 -m-2'
          )}
          aria-label="Add custom theme"
        >
          <div className="flex items-center justify-center size-10 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors bg-muted/50">
            <PlusIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Custom
          </span>
        </button>
      </div>
    </div>
  );
}
