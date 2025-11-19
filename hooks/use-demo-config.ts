"use client";

import { useLocalStorage } from "usehooks-ts";
import { demoConfig } from "@/config/demo";

export const useDemoConfig = () => {
  const [value, setValue] = useLocalStorage("mm-demo-config", demoConfig);
  console.log("[KB Debug] useDemoConfig value:", value);
  console.log("[KB Debug] knowledgeBase from localStorage:", value?.context?.knowledgeBase);
  return { value: value || demoConfig, setValue };
};
