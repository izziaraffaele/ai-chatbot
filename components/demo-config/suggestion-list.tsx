import { PlusIcon, X } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../ui/input-group';
import { Button } from '../ui/button';
import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

export function SuggestionListControl(
  props: React.ComponentProps<'div'> & {
    placeholder?: string;
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
  }
) {
  const {
    value = [],
    placeholder,
    defaultValue,
    className,
    onValueChange = () => {},
    ...others
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  const prepend = (newValue: string) => onValueChange([newValue, ...value]);

  const remove = (index: number) =>
    onValueChange(value?.filter((_, i) => i !== index));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputValue = inputRef.current?.value;

      // prepend the new value
      if (inputValue?.length) {
        prepend(inputValue);
      }

      // clear the input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleAdd = () => {
    const inputValue = inputRef.current?.value;

    // prepend the new value
    if (inputValue?.length) {
      prepend(inputValue);
    }

    // clear the input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div {...others} className={cn('space-y-2', className)}>
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          placeholder={placeholder || 'Enter a new suggestion'}
          onKeyDown={handleKeyDown}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            className="rounded-full"
            size="icon-xs"
            onClick={handleAdd}
          >
            <PlusIcon className="size-3" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {value?.map((item: string, i) => {
        return (
          <div
            key={item}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2"
          >
            <span className="text-sm flex-1 truncate">{item}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => remove(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
