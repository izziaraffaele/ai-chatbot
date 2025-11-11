'use client';

import { demoConfig } from '@/config/demo';
import { DemoConfig } from '@/config/demo.schema';
import useSWR from 'swr';

export const useDemoConfig = () => {
  const { data: value, mutate: setValue } = useSWR<DemoConfig>(
    ['demo-config'],
    {
      fallbackData: demoConfig,
    }
  );

  return { value: value || demoConfig, setValue };
};
