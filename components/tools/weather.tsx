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
import { Weather as WeatherDisplay } from "@/components/weather";
import type { ChatToolProps } from "./types";

/**
 * Weather Tool Props
 * Uses generic type since weather tool may not be available on all agents
 */
export type WeatherToolProps = ChatToolProps;

/**
 * Weather Tool UI Component
 * Displays weather tool invocations with location input and weather output
 */
function PureWeather({ part }: WeatherToolProps) {
  return (
    <Tool defaultOpen={true}>
      <ToolHeader state={part.state} type="tool-getWeather" />
      <ToolContent>
        {part.state === "input-available" && <ToolInput input={part.input} />}
        {part.state === "output-available" && part.output && (
          <ToolOutput
            errorText={undefined}
            output={<WeatherDisplay weatherAtLocation={part.output as any} />}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

export const Weather = memo(PureWeather, (prevProps, nextProps) => {
  return (
    equal(prevProps.part, nextProps.part) &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});

Weather.displayName = "Weather";
