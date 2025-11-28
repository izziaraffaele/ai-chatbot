"use client";

import { useEffect, useRef } from "react";
import { registerBuiltInWidgets } from "@/lib/canvas";

/**
 * CanvasInit
 * Initializes the canvas widget registry on first render.
 * Should be included once in the app layout.
 */
export function CanvasInit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      registerBuiltInWidgets();
      initialized.current = true;
    }
  }, []);

  return null;
}

