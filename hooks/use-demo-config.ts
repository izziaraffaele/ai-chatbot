"use client";

import useSWR from "swr";
import { demoConfig } from "@/config/demo";
import type { DemoConfig } from "@/config/demo.schema";

export const useDemoConfig = () => {
  const { data: value, mutate: setValue } = useSWR<DemoConfig>(
    ["demo-config"],
    {
      fallbackData: demoConfig,
    }
  );

  return { value: value || demoConfig, setValue };
};
