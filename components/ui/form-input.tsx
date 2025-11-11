import { Control, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';
import { Slot } from '@radix-ui/react-slot';
import { HTMLInputTypeAttribute } from 'react';

export type FormInputProps<VALUES extends FieldValues> = Omit<
  React.ComponentProps<typeof FormField<VALUES>>,
  'render' | 'type'
> & {
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  asChild?: boolean;
  children?: React.ReactNode;
  label?: string;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  render?: React.ComponentProps<typeof FormField<VALUES>>['render'];
};

export const FormInput = <VALUES extends FieldValues>({
  helperText,
  render,
  asChild,
  label,
  children,
  placeholder,
  type,
  ...others
}: FormInputProps<VALUES>) => {
  const InputComp = asChild ? Slot : Input;
  return (
    <FormField
      render={(renderProps) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            {render ? (
              render(renderProps)
            ) : (
              <InputComp
                type={type}
                placeholder={placeholder}
                // className={
                //   renderProps.fieldState.error ? 'border-destructive' : ''
                // }
                {...renderProps.field}
              >
                {children}
              </InputComp>
            )}
          </FormControl>
          {helperText && <FormDescription>{helperText}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
      {...others}
    />
  );
};
