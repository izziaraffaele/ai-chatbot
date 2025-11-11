'use client';

import { demoConfig } from '@/config/demo';
import { useLocalStorage } from 'usehooks-ts';

export const useDemoConfig = () => {
  const [value, setValue] = useLocalStorage('mm-demo-config', demoConfig);
  return { value: value || demoConfig, setValue };
};
