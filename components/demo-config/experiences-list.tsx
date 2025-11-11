import { DemoConfig, DemoConfigSchema } from '@/config/demo.schema';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '../ui/item';
import { useForm } from 'react-hook-form';
import * as z from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '../ui/form';
import { FormInput } from '../ui/form-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { PlusIcon } from '../icons';
import { TrashIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';

export type ExperienceConfig = DemoConfig['runtime']['experiences'][number];
export type IntentConfig = DemoConfig['runtime']['intents'][number];

const ExperienceInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  triggeredBy: z.string().nullable(),
  triggerThreshold: z.number().min(0).max(1),
});

export const ExperiencesListControl = (
  props: React.ComponentProps<'div'> & {
    value?: ExperienceConfig[];
    intents?: IntentConfig[];
    onAdd?: (value: ExperienceConfig) => void;
    onRemove?: (index: number) => void;
  }
) => {
  const {
    value = [],
    className,
    intents,
    onAdd = () => {},
    onRemove = () => {},
    ...others
  } = props;

  const [isEditing, setIsEditing] = useState(false);

  const experienceForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      triggeredBy: null,
      triggerThreshold: 0.8,
    },
    resolver: zodResolver(ExperienceInputSchema),
  });

  const handleSubmitAdd = experienceForm.handleSubmit((data) => {
    onAdd(data);
    setIsEditing(false);
    experienceForm.reset();
  });

  if (!isEditing) {
    return (
      <div className={cn('space-y-4', className)} {...others}>
        {value.length === 0 && (
          <div className="text-muted-foreground">
            No experiences have been added yet
          </div>
        )}
        {value.map((exp, i) => (
          <Item key={exp.name}>
            <ItemContent>
              <ItemTitle>{exp.name}</ItemTitle>
              <ItemDescription>{exp.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={() => onRemove(i)}
              >
                <TrashIcon />
              </Button>
            </ItemActions>
          </Item>
        ))}
        <Button
          variant="outline"
          className="w-full items-center gap-2"
          onClick={() => setIsEditing(true)}
        >
          <PlusIcon />
          <span>Add</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={className} {...others}>
      <Form {...experienceForm}>
        <form className="space-y-4" onSubmit={handleSubmitAdd}>
          <FormInput
            control={experienceForm.control}
            name="name"
            label="Name"
          />
          <FormInput
            control={experienceForm.control}
            name="description"
            label="Description"
            asChild
          >
            <Textarea rows={3} />
          </FormInput>
          <FormInput
            control={experienceForm.control}
            name="triggeredBy"
            label="Triggered By"
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={(v) => {
                  field.onChange({ target: { value: v } } as any);
                  field.onBlur();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {intents?.map((v) => (
                      <SelectItem value={v.name}>
                        {v.name}: ${v.description}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};
