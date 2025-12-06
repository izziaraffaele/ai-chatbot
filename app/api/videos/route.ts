import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * Video metadata type
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
 * Transcript JSON structure
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
const CDN_IMAGES_URL = `${CDN_BASE_URL}/images`;

/**
 * Regex patterns for folder name parsing
 */
const FOLDER_PREFIX_REGEX = /^EDITED - Hybrid Course-\d{8} \d{4}-\d+ /;
const FOLDER_SUFFIX_REGEX = /_\d+$/;
const WEEK_REGEX = /W(\d+)/;
const LESSON_REGEX = /L(\d+)/;
const WEEK_CLEAN_REGEX = /W\d+\s*/g;
const LESSON_CLEAN_REGEX = /L\d+\s*/g;

/**
 * Parse folder name to extract week, lesson, and title
 */
function parseFolderName(folderName: string): {
  week?: string;
  lesson?: string;
  title: string;
} {
  const cleanName = folderName
    .replace(FOLDER_PREFIX_REGEX, "")
    .replace(FOLDER_SUFFIX_REGEX, "");

  const weekMatch = cleanName.match(WEEK_REGEX);
  const lessonMatch = cleanName.match(LESSON_REGEX);

  const week = weekMatch ? `W${weekMatch[1]}` : undefined;
  const lesson = lessonMatch ? `L${lessonMatch[1]}` : undefined;

  let title = cleanName
    .replace(WEEK_CLEAN_REGEX, "")
    .replace(LESSON_CLEAN_REGEX, "")
    .trim();

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
      const firstSegments = json.segments.slice(0, 2);
      const text = firstSegments.map((s) => s.text.trim()).join(" ");
      return text.length > 200 ? `${text.substring(0, 197)}...` : text;
    }
    return "Video content from H-FARM course";
  } catch {
    return "Video content from H-FARM course";
  }
}

/**
 * Fetch summary JSON from CDN
 */
async function fetchSummaryFromCDN(
  folderName: string
): Promise<SummaryJson | null> {
  try {
    // Build the summary JSON filename: folder name + _summary.json with spaces as + then URL-encoded
    const summaryFilename = encodeURIComponent(
      `${folderName}_summary.json`.replaceAll(" ", "+")
    );
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
 */
async function scanKnowledgeBase(basePath: string): Promise<VideoMetadata[]> {
  const videos: VideoMetadata[] = [];

  if (!existsSync(basePath)) {
    return videos;
  }

  const folders = readdirSync(basePath, { withFileTypes: true });

  const videoPromises = folders.map(async (folder) => {
    if (!folder.isDirectory()) {
      return null;
    }

    const folderPath = join(basePath, folder.name);
    const folderContents = readdirSync(folderPath);

    const mp4File = folderContents.find((f) => f.endsWith(".mp4"));
    if (!mp4File) {
      return null;
    }

    const jsonFile = folderContents.find(
      (f) =>
        f.endsWith(".json") && !f.includes("_music") && !f.includes("_summary")
    );

    const { week, lesson, title: fallbackTitle } = parseFolderName(folder.name);

    const transcriptPath = jsonFile ? join(folderPath, jsonFile) : null;

    const duration = transcriptPath
      ? getDurationFromTranscript(transcriptPath)
      : 0;
    const fallbackDescription = transcriptPath
      ? getDescriptionFromTranscript(transcriptPath)
      : "Video content from H-FARM course";

    const summaryData = await fetchSummaryFromCDN(folder.name);

    const title = summaryData?.title ?? fallbackTitle;
    const description = summaryData?.summary ?? fallbackDescription;

    const id = folder.name
      .toLowerCase()
      .replaceAll(/[^\da-z]/g, "-")
      .replaceAll(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Video URL from CDN - use mp4 filename with spaces as + then URL-encoded
    const videoUrl = `${CDN_VIDEO_URL}/${encodeURIComponent(mp4File.replaceAll(" ", "+"))}`;
    // Thumbnail URL from CDN - folder name + _thumbnail.png with spaces as + then URL-encoded
    const thumbnailUrl = `${CDN_IMAGES_URL}/${encodeURIComponent(`${folder.name.replaceAll(" ", "+")}_thumbnail.png`)}`;

    return {
      id,
      title,
      description,
      duration,
      videoUrl,
      thumbnailUrl,
      folder: folder.name,
      week,
      lesson,
    } as VideoMetadata;
  });

  const results = await Promise.all(videoPromises);

  for (const video of results) {
    if (video) {
      videos.push(video);
    }
  }

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
 * GET /api/videos
 * Returns the list of available videos from the knowledge base
 */
export async function GET() {
  try {
    const knowledgeBasePath = resolve(
      process.cwd(),
      "mastra/knowledgebase/hfarm"
    );

    const videos = await scanKnowledgeBase(knowledgeBasePath);

    return NextResponse.json({
      success: true,
      videos,
      totalCount: videos.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to list videos: ${message}`,
      },
      { status: 500 }
    );
  }
}
