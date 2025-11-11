import { zodResolver } from '@hookform/resolvers/zod';
import { TrashIcon } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { type DemoConfig, DemoConfigSchema } from '@/config/demo.schema';
import { cn } from '@/lib/utils';
import { PlusIcon } from '../icons';
import { Button } from '../ui/button';
import { Form } from '../ui/form';
import { FormInput } from '../ui/form-input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '../ui/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
                className="rounded-full"
                onClick={() => onRemove(i)}
                size="icon"
                variant="ghost"
              >
                <TrashIcon />
              </Button>
            </ItemActions>
          </Item>
        ))}
        <Button
          className="w-full items-center gap-2"
          onClick={() => setIsEditing(true)}
          variant="outline"
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
            label="Name"
            name="name"
          />
          <FormInput
            asChild
            control={experienceForm.control}
            label="Description"
            name="description"
          >
            <Textarea rows={3} />
          </FormInput>
          <FormInput
            control={experienceForm.control}
            label="Triggered By"
            name="triggeredBy"
            render={({ field }) => (
              <Select
                onValueChange={(v) => {
                  field.onChange({ target: { value: v } } as any);
                  field.onBlur();
                }}
                value={String(field.value)}
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
          <Button className="w-full" type="submit">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};
