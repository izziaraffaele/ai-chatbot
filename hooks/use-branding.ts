'use client';

import { useDemoConfig } from './use-demo-config';

export function useBranding() {
  const { value } = useDemoConfig();
  return {
    ...value.appearance,
    app: { name: 'Assistant', ...value.context.app },
    organization: { name: 'MemorAIz', ...value.context.organization },
    assistant: {
      name: value.assistant.name,
      description: value.assistant.description,
    },
  };
}
