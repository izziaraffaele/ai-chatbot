import { zodResolver } from '@hookform/resolvers/zod';
import { TrashIcon } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import type { DemoConfig } from '@/config/demo.schema';
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
          <Button className="w-full" type="submit">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
};
