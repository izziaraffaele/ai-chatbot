import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Video metadata type matching the UI component expectations
 */
type VideoMetadata = {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  thumbnailUrl?: string;
  folder: string;
  week?: string;
  lesson?: string;
};

/**
 * Transcript JSON structure from knowledgebase
 */
type TranscriptJson = {
  detected_language?: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
};

/**
 * Summary JSON structure from CDN
 */
type SummaryJson = {
  title: string;
  summary: string;
};

/**
 * CDN base URLs
 */
const CDN_BASE_URL = "https://cdn.memoraiz.com";
const CDN_VIDEO_URL = `${CDN_BASE_URL}/video/HFARM`;
const CDN_JSON_URL = `${CDN_BASE_URL}/json/HFARM`;

/**
 * Regex patterns for folder name parsing (top-level for performance)
 */
const FOLDER_PREFIX_REGEX = /^EDITED - Hybrid Course-\d{8} \d{4}-\d+ /;
const FOLDER_SUFFIX_REGEX = /_\d+$/;
const WEEK_REGEX = /W(\d+)/;
const LESSON_REGEX = /L(\d+)/;
const WEEK_CLEAN_REGEX = /W\d+\s*/g;
const LESSON_CLEAN_REGEX = /L\d+\s*/g;

/**
 * Parse folder name to extract week, lesson, and title
 * Format: "EDITED - Hybrid Course-20251129 1421-1 W1 L1 What is Research"
 */
function parseFolderName(folderName: string): {
  week?: string;
  lesson?: string;
  title: string;
} {
  // Remove "EDITED - Hybrid Course-" prefix and date/time
  const cleanName = folderName
    .replace(FOLDER_PREFIX_REGEX, "")
    .replace(FOLDER_SUFFIX_REGEX, ""); // Remove trailing _1, _2 etc.

  // Extract W{n} L{n} pattern
  const weekMatch = cleanName.match(WEEK_REGEX);
  const lessonMatch = cleanName.match(LESSON_REGEX);

  const week = weekMatch ? `W${weekMatch[1]}` : undefined;
  const lesson = lessonMatch ? `L${lessonMatch[1]}` : undefined;

  // Extract title (everything after W{n} L{n} pattern)
  let title = cleanName
    .replace(WEEK_CLEAN_REGEX, "")
    .replace(LESSON_CLEAN_REGEX, "")
    .trim();

  // If no title extracted, use a clean version of the folder name
  if (!title) {
    title = cleanName;
  }

  return { week, lesson, title };
}

/**
 * Get duration from transcript JSON
 */
function getDurationFromTranscript(transcriptPath: string): number {
  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const json = JSON.parse(content) as TranscriptJson;

    if (json.segments && json.segments.length > 0) {
      // Get the end time of the last segment
      const lastSegment = json.segments.at(-1);
      return lastSegment?.end ?? 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Get description from transcript (first few sentences) - fallback only
 */
function getDescriptionFromTranscript(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const json = JSON.parse(content) as TranscriptJson;

    if (json.segments && json.segments.length > 0) {
      // Get first 2 segments for description
      const firstSegments = json.segments.slice(0, 2);
      const text = firstSegments.map((s) => s.text.trim()).join(" ");
      // Limit to ~200 characters
      return text.length > 200 ? `${text.substring(0, 197)}...` : text;
    }
    return "Video content from H-FARM course";
  } catch {
    return "Video content from H-FARM course";
  }
}

/**
 * Fetch summary JSON from CDN
 * Returns title and summary, or null if fetch fails
 */
async function fetchSummaryFromCDN(
  folderName: string
): Promise<SummaryJson | null> {
  try {
    // Build the summary JSON filename: folder name + _summary.json with spaces as +
    const summaryFilename = `${folderName}_summary.json`.replaceAll(" ", "+");
    const url = `${CDN_JSON_URL}/${summaryFilename}`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as SummaryJson;
    if (json.title && json.summary) {
      return json;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Scan knowledge base directory and collect video metadata
 * Fetches title and summary from CDN, falls back to local parsing
 */
async function scanKnowledgeBase(basePath: string): Promise<VideoMetadata[]> {
  const videos: VideoMetadata[] = [];

  if (!existsSync(basePath)) {
    return videos;
  }

  const folders = readdirSync(basePath, { withFileTypes: true });

  // Process folders and fetch CDN data in parallel
  const videoPromises = folders.map(async (folder) => {
    if (!folder.isDirectory()) {
      return null;
    }

    const folderPath = join(basePath, folder.name);
    const folderContents = readdirSync(folderPath);

    // Find the MP4 file
    const mp4File = folderContents.find((f) => f.endsWith(".mp4"));
    if (!mp4File) {
      return null;
    }

    // Find the JSON transcript (for duration fallback)
    const jsonFile = folderContents.find(
      (f) =>
        f.endsWith(".json") && !f.includes("_music") && !f.includes("_summary")
    );

    // Parse folder name for week/lesson and fallback title
    const { week, lesson, title: fallbackTitle } = parseFolderName(folder.name);

    // Get transcript path for duration and fallback description
    const transcriptPath = jsonFile ? join(folderPath, jsonFile) : null;

    const duration = transcriptPath
      ? getDurationFromTranscript(transcriptPath)
      : 0;
    const fallbackDescription = transcriptPath
      ? getDescriptionFromTranscript(transcriptPath)
      : "Video content from H-FARM course";

    // Fetch title and summary from CDN
    const summaryData = await fetchSummaryFromCDN(folder.name);

    // Use CDN data if available, otherwise fall back to local parsing
    const title = summaryData?.title ?? fallbackTitle;
    const description = summaryData?.summary ?? fallbackDescription;

    // Create a URL-safe ID from folder name
    const id = folder.name
      .toLowerCase()
      .replaceAll(/[^\da-z]/g, "-")
      .replaceAll(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Video URL from CDN - use mp4 filename with spaces encoded as + signs
    const videoUrl = `${CDN_VIDEO_URL}/${mp4File.replaceAll(" ", "+")}`;

    return {
      id,
      title,
      description,
      duration,
      videoUrl,
      folder: folder.name,
      week,
      lesson,
    } as VideoMetadata;
  });

  // Wait for all fetches to complete
  const results = await Promise.all(videoPromises);

  // Filter out null results
  for (const video of results) {
    if (video) {
      videos.push(video);
    }
  }

  // Sort by week and lesson
  return videos.sort((a, b) => {
    const weekA = a.week ? Number.parseInt(a.week.replace("W", ""), 10) : 999;
    const weekB = b.week ? Number.parseInt(b.week.replace("W", ""), 10) : 999;
    if (weekA !== weekB) {
      return weekA - weekB;
    }

    const lessonA = a.lesson
      ? Number.parseInt(a.lesson.replace("L", ""), 10)
      : 999;
    const lessonB = b.lesson
      ? Number.parseInt(b.lesson.replace("L", ""), 10)
      : 999;
    return lessonA - lessonB;
  });
}

/**
 * List Videos Tool
 *
 * Retrieves available course videos from H-FARM's knowledge base.
 * Supports optional search filtering by title, week, or lesson.
 */
export const listVideosTool = createTool({
  id: "listVideos",
  description:
    "List available course videos from the H-FARM video library. Optionally filter by search query to find specific topics, weeks, or lessons.",
  inputSchema: z.object({
    search: z
      .string()
      .optional()
      .describe(
        "Optional search query to filter videos by title, week (e.g., 'W1'), or lesson (e.g., 'L2')"
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    error: z.string().optional(),
    videos: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          duration: z.number(),
          videoUrl: z.string(),
          thumbnailUrl: z.string().optional(),
          folder: z.string(),
          week: z.string().optional(),
          lesson: z.string().optional(),
        })
      )
      .optional(),
    totalCount: z.number().optional(),
  }),
  execute: async ({ context }) => {
    try {
      // Knowledge base path (relative to project root)
      const knowledgeBasePath = resolve(
        process.cwd(),
        "mastra/knowledgebase/hfarm"
      );

      // Scan for videos (fetches CDN data in parallel)
      let videos = await scanKnowledgeBase(knowledgeBasePath);

      // Apply search filter if provided
      const search = context.search?.toLowerCase();
      if (search) {
        videos = videos.filter(
          (v) =>
            v.title.toLowerCase().includes(search) ||
            v.description.toLowerCase().includes(search) ||
            v.week?.toLowerCase().includes(search) ||
            v.lesson?.toLowerCase().includes(search) ||
            v.folder.toLowerCase().includes(search)
        );
      }

      return {
        success: true,
        videos,
        totalCount: videos.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        success: false,
        error: `Failed to list videos: ${message}`,
      };
    }
  },
});
