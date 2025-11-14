"use client";

import equal from "fast-deep-equal";
import { memo } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import { Weather } from "@/components/weather";

import type { InferToolUIComponentProps } from "./types";

export type WeatherToolUIProps = InferToolUIComponentProps<"tool-getWeather">;

/**
 * WeatherToolUI Component
 * Displays weather tool invocations with location input and weather output
 * Memoized to prevent re-renders when part or isReadonly props haven't changed
 */
function PureWeatherToolUI({ part }: WeatherToolUIProps) {
  return (
    <Tool defaultOpen={true}>
      <ToolHeader state={part.state} type="tool-getWeather" />
      <ToolContent>
        {part.state === "input-available" && <ToolInput input={part.input} />}
        {part.state === "output-available" && part.output && (
          <ToolOutput
            errorText={undefined}
            output={<Weather weatherAtLocation={part.output as any} />}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

export const WeatherToolUI = memo(PureWeatherToolUI, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

WeatherToolUI.displayName = "WeatherToolUI";
