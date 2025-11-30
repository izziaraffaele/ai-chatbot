"use client";

import { useMemo } from "react";
import { useDemoConfig } from "@/hooks/use-demo-config";
import { THEME_COLOR_PRESETS } from "@/lib/branding/theme-presets";

export type UseAssistantReturn = {
  displayName?: string;
  avatar?: React.ReactNode;
  avatarColor?: string;
};

/**
 * Hook to get assistant display information from demo config
 * Provides assistant name, avatar, and avatar color for use in chat components
 */
export function useAssistant(): UseAssistantReturn {
  const { value: demoConfig } = useDemoConfig();

  return useMemo(() => {
    const assistant = demoConfig.assistant;
    const appearance = demoConfig.appearance;

    // Get primary color from theme color preset
    const themePreset = THEME_COLOR_PRESETS.find(
      (p) => p.css === appearance.customCss
    );
    const avatarColor = themePreset?.previewColors?.primary;

    return {
      displayName: assistant.name,
      avatar: assistant.avatar ? (
        <img
          alt={assistant.name}
          className="h-full w-full object-cover"
          height="100%"
          src={assistant.avatar}
          width="100%"
        />
      ) : undefined,
      avatarColor,
    };
  }, [demoConfig]);
}
