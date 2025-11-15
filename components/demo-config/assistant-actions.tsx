"use client";
import { DemoConfigMemorySchema, DemoConfigSchema } from "@/config/demo.schema";
import { useAssistantAction } from "@/hooks/use-assistant-action";
import { useDemoConfig } from "@/hooks/use-demo-config";
import { THEME_COLOR_PRESETS } from "@/lib/branding/theme-presets";
import { deepMerge } from "@/lib/utils";

export const DemoConfigActions = () => {
  const { value: currentConfig, setValue } = useDemoConfig();

  useAssistantAction({
    id: "updateDemoConfig",
    description:
      "Update the demo configuration with partial changes. Merges the provided configuration with the existing configuration. Useful for dynamically updating assistant identity, appearance, chat features, and runtime settings. Use this tool only if the user explicitely asks to set demo configuration.",
    inputSchema: DemoConfigMemorySchema,
    execute: ({ context }) => {
      const themeColor = context.appearance?.themeColor;
      const themeColorPreset = THEME_COLOR_PRESETS.find(
        (colorPreset) => colorPreset.id === themeColor
      );

      const contextConfig = {
        ...context,
        appearance: context.appearance && {
          preset: context.appearance.preset,
          customCss: themeColorPreset?.css,
        },
      };

      // Deep merge: merge context (partial updates) with current config
      const mergedConfig = deepMerge(currentConfig, contextConfig);

      // Validate merged config
      const validatedConfig = DemoConfigSchema.parse(mergedConfig);

      // Update value
      setValue(validatedConfig);

      return Promise.resolve({
        success: true,
        message: "Demo configuration updated successfully",
        config: validatedConfig,
      });
    },
  });

  return null;
};
