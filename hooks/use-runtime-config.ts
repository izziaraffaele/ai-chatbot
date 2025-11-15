import { useMemo } from "react";
import { runtimeConfig as defaultRuntimeConfig } from "@/config/runtime";
import type { RuntimeConfig } from "@/config/runtime.schema";
import { useDemoConfig } from "./use-demo-config";

export function useRuntimeConfig() {
  const { value: demoConfig } = useDemoConfig();

  return useMemo<RuntimeConfig>(
    () => ({
      ...defaultRuntimeConfig,
      assistant: {
        ...defaultRuntimeConfig.assistant,
        name: demoConfig.assistant.name,
        description: demoConfig.assistant.description,
        tone: demoConfig.assistant.tone,
        roles: demoConfig.assistant.roles,
        guidelines: demoConfig.assistant.guidelines,
        instructions: demoConfig.assistant.instructions,
      },
      organization: {
        ...defaultRuntimeConfig.organization,
        name:
          demoConfig.context.organization?.name ||
          defaultRuntimeConfig.organization.name,
        description:
          demoConfig.context.organization?.description ||
          defaultRuntimeConfig.organization.description,
      },
      features: demoConfig.chat.features,
      experiences: demoConfig.runtime.experiences,
      intents: demoConfig.runtime.intents,
    }),
    [demoConfig]
  );
}
