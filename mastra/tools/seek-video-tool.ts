import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Format time in seconds to MM:SS or HH:MM:SS format
 */
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Seek Video Tool
 *
 * Allows the agent to seek the video player to a specific timestamp.
 * Used when a user asks about where something is discussed in the current video.
 *
 * The agent analyzes the video transcript (provided in its context when a video is playing)
 * and determines the appropriate timestamp to seek to.
 *
 * @example
 * User: "When does the speaker talk about research methodology?"
 * Agent: Finds "[2:30] We'll now discuss research methodology..." in transcript
 * Agent: Calls seekVideo({ time: 150, reason: "Research methodology discussion", videoFolder: "..." })
 */
export const seekVideoTool = createTool({
  id: "seekVideo",
  description:
    "Seek the video player to a specific timestamp. Use this when the user asks where something is discussed in the current video. Analyze the transcript to find the relevant timestamp. IMPORTANT: Always include videoFolder and videoTitle from the current video context.",
  inputSchema: z.object({
    time: z
      .number()
      .min(0)
      .describe("The timestamp to seek to in seconds (e.g., 150 for 2:30)"),
    reason: z
      .string()
      .optional()
      .describe(
        "Brief explanation of what is at this timestamp (e.g., 'Research methodology discussion')"
      ),
    videoFolder: z
      .string()
      .optional()
      .describe(
        "The folder name of the current video (from the 'Video transcript:' description in the context). Required to open the video if the canvas is closed."
      ),
    videoTitle: z
      .string()
      .optional()
      .describe(
        "The title of the current video. Required to open the video if the canvas is closed."
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    time: z.number().describe("The timestamp in seconds"),
    formattedTime: z.string().describe("The timestamp formatted as MM:SS"),
    reason: z.string().optional().describe("Context for the seek"),
    videoFolder: z.string().optional().describe("Video folder for reopening"),
    videoTitle: z.string().optional().describe("Video title for display"),
    error: z.string().optional(),
  }),
  // biome-ignore lint/suspicious/useAwait: Mastra requires async execute function
  execute: async ({ context }) => {
    const { time, reason, videoFolder, videoTitle } = context;

    // Validate time is a valid number
    if (typeof time !== "number" || Number.isNaN(time)) {
      return {
        success: false,
        time: 0,
        formattedTime: "0:00",
        error: "Invalid time value provided",
      };
    }

    // Validate time is non-negative
    if (time < 0) {
      return {
        success: false,
        time: 0,
        formattedTime: "0:00",
        error: "Time cannot be negative",
      };
    }

    // Format the time for display
    const formattedTime = formatTime(time);

    return {
      success: true,
      time,
      formattedTime,
      reason,
      videoFolder,
      videoTitle,
    };
  },
});
