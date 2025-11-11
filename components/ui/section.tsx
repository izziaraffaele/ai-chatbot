import * as React from 'react';
import { cn } from '@/lib/utils';

const Section = ({ className, ...props }: React.ComponentProps<'section'>) => (
  <section
    data-slot="section"
    className={cn('space-y-6 p-4', className)}
    {...props}
  />
);

Section.displayName = 'Section';

const SectionTitle = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="section-title"
    className={cn(
      'text-xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
);
SectionTitle.displayName = 'SectionTitle';

const SectionContent = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => (
  <div
    data-slot="section-content"
    className={cn('text-sm', className)}
    {...props}
  />
);
SectionContent.displayName = 'SectionContent';

export { Section, SectionTitle, SectionContent };
