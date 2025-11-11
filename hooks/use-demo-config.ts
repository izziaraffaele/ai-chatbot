"use client";

import { useLocalStorage } from "usehooks-ts";
import { demoConfig } from "@/config/demo";

export const useDemoConfig = () => {
  const [value, setValue] = useLocalStorage("mm-demo-config", demoConfig);
  return { value: value || demoConfig, setValue };
};
