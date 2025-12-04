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
    .replace(/^EDITED - Hybrid Course-\d{8} \d{4}-\d+ /, "")
    .replace(/_\d+$/, ""); // Remove trailing _1, _2 etc.

  // Extract W{n} L{n} pattern
  const weekMatch = cleanName.match(/W(\d+)/);
  const lessonMatch = cleanName.match(/L(\d+)/);

  const week = weekMatch ? `W${weekMatch[1]}` : undefined;
  const lesson = lessonMatch ? `L${lessonMatch[1]}` : undefined;

  // Extract title (everything after W{n} L{n} pattern)
  let title = cleanName.replace(/W\d+\s*/g, "").replace(/L\d+\s*/g, "").trim();

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
 * Get description from transcript (first few sentences)
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
 * Scan knowledge base directory and collect video metadata
 */
function scanKnowledgeBase(basePath: string): VideoMetadata[] {
  const videos: VideoMetadata[] = [];

  if (!existsSync(basePath)) {
    return videos;
  }

  const folders = readdirSync(basePath, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) {
      continue;
    }

    const folderPath = join(basePath, folder.name);
    const folderContents = readdirSync(folderPath);

    // Find the MP4 file
    const mp4File = folderContents.find((f) => f.endsWith(".mp4"));
    if (!mp4File) {
      continue;
    }

    // Find the JSON transcript
    const jsonFile = folderContents.find(
      (f) => f.endsWith(".json") && !f.includes("_music")
    );

    const { week, lesson, title } = parseFolderName(folder.name);

    // Get transcript path for duration and description
    const transcriptPath = jsonFile ? join(folderPath, jsonFile) : null;

    const duration = transcriptPath
      ? getDurationFromTranscript(transcriptPath)
      : 0;
    const description = transcriptPath
      ? getDescriptionFromTranscript(transcriptPath)
      : "Video content from H-FARM course";

    // Create a URL-safe ID from folder name
    const id = folder.name
      .toLowerCase()
      .replaceAll(/[^\da-z]/g, "-")
      .replaceAll(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Video URL from CDN - use mp4 filename with spaces encoded as + signs
    const CDN_BASE_URL = "https://cdn.memoraiz.com/video/HFARM";
    const videoUrl = `${CDN_BASE_URL}/${mp4File.replaceAll(" ", "+")}`;

    videos.push({
      id,
      title,
      description,
      duration,
      videoUrl,
      folder: folder.name,
      week,
      lesson,
    });
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

      // Scan for videos
      let videos = scanKnowledgeBase(knowledgeBasePath);

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
