import { DemoConfig } from '@/config/demo.schema';
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
import { Button } from '../ui/button';
import { PlusIcon } from '../icons';
import { TrashIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';

type IntentConfig = DemoConfig['runtime']['intents'][number];

const ExperienceInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  triggeredBy: z.string().nullable(),
  triggerThreshold: z.number().min(0).max(1),
});

export const IntentsListControl = (
  props: React.ComponentProps<'div'> & {
    value?: IntentConfig[];
    onAdd?: (value: IntentConfig) => void;
    onRemove?: (index: number) => void;
  }
) => {
  const {
    value = [],
    className,
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
            No intents have been added yet
          </div>
        )}
        {value.map((item, i) => (
          <Item key={item.name}>
            <ItemContent>
              <ItemTitle>{item.name}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
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
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};
