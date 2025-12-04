/**
 * Video Transcript & Learning Content Utilities
 *
 * Fetches and processes video transcripts and learning content from the CDN.
 * - Transcripts are JSON files containing timestamped text segments.
 * - Learning content contains quiz questions and flashcards for each video.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Individual transcript segment with timing information
 */
export type TranscriptSegment = {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Transcript text for this segment */
  text: string;
};

/**
 * Full transcript data structure from CDN
 */
export type TranscriptData = {
  /** Detected language of the transcript */
  detected_language?: string;
  /** Array of timestamped segments */
  segments: TranscriptSegment[];
};

/**
 * Quiz question from learning content JSON
 * Matches ModelQuizQuestion schema from activities
 */
export type LearningContentQuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string;
};

/**
 * Flashcard from learning content JSON
 * Matches ModelFlashcard schema from activities
 */
export type LearningContentFlashcard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
};

/**
 * Learning content data structure from CDN
 * Contains quiz questions and flashcards for a video
 */
export type LearningContentData = {
  quiz: LearningContentQuizQuestion[];
  flashcards: LearningContentFlashcard[];
};

// ============================================================================
// CONSTANTS
// ============================================================================

const CDN_BASE_URL = "https://cdn.memoraiz.com";
const CDN_JSON_URL = `${CDN_BASE_URL}/json/HFARM`;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Builds the CDN URL for a transcript JSON file
 *
 * @param folderName - The folder name from the video metadata
 * @returns The full CDN URL for the transcript
 *
 * @example
 * buildTranscriptUrl("EDITED - Hybrid Course-20251129 1631-1 W1 L6 We find problems")
 * // Returns: "https://cdn.memoraiz.com/json/HFARM/EDITED+-+Hybrid+Course-20251129+1631-1+W1+L6+We+find+problems.json"
 */
export function buildTranscriptUrl(folderName: string): string {
  // Replace spaces with + for URL encoding (CDN convention)
  const encodedName = folderName.replaceAll(" ", "+");
  return `${CDN_JSON_URL}/${encodedName}.json`;
}

/**
 * Fetches a transcript from the CDN
 *
 * @param folderName - The folder name from the video metadata
 * @returns The transcript data, or null if fetch fails
 */
export async function fetchTranscript(
  folderName: string
): Promise<TranscriptData | null> {
  try {
    const url = buildTranscriptUrl(folderName);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch transcript: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TranscriptData;

    // Validate the response has the expected structure
    if (!data.segments || !Array.isArray(data.segments)) {
      console.warn("Invalid transcript structure: missing segments array");
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error fetching transcript:", error);
    return null;
  }
}

/**
 * Builds the CDN URL for a learning content JSON file
 *
 * @param folderName - The folder name from the video metadata
 * @returns The full CDN URL for the learning content
 *
 * @example
 * buildLearningContentUrl("EDITED - Hybrid Course-20251129 1631-1 W1 L6 We find problems")
 * // Returns: "https://cdn.memoraiz.com/json/HFARM/EDITED+-+Hybrid+Course-20251129+1631-1+W1+L6+We+find+problems_learning_content.json"
 */
export function buildLearningContentUrl(folderName: string): string {
  // Replace spaces with + for URL encoding (CDN convention)
  const encodedName = folderName.replaceAll(" ", "+");
  return `${CDN_JSON_URL}/${encodedName}_learning_content.json`;
}

/**
 * Fetches learning content (quiz and flashcards) from the CDN
 *
 * @param folderName - The folder name from the video metadata
 * @returns The learning content data, or null if fetch fails
 */
export async function fetchLearningContent(
  folderName: string
): Promise<LearningContentData | null> {
  try {
    const url = buildLearningContentUrl(folderName);
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch learning content: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as LearningContentData;

    // Validate the response has the expected structure
    if (!data.quiz && !data.flashcards) {
      console.warn(
        "Invalid learning content structure: missing quiz and flashcards"
      );
      return null;
    }

    // Ensure arrays exist even if empty
    return {
      quiz: Array.isArray(data.quiz) ? data.quiz : [],
      flashcards: Array.isArray(data.flashcards) ? data.flashcards : [],
    };
  } catch (error) {
    console.warn("Error fetching learning content:", error);
    return null;
  }
}

/**
 * Formats a time in seconds to MM:SS or HH:MM:SS format
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Finds the current segment index based on video playback time
 *
 * @param segments - Array of transcript segments
 * @param currentTime - Current video time in seconds
 * @returns Index of the current segment, or -1 if none
 */
export function findCurrentSegmentIndex(
  segments: TranscriptSegment[],
  currentTime: number
): number {
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (currentTime >= segment.start && currentTime < segment.end) {
      return i;
    }
  }
  // If past all segments, return the last one
  if (segments.length > 0 && currentTime >= segments.at(-1)!.end) {
    return segments.length - 1;
  }
  return -1;
}

/**
 * Formats transcript data as readable text with timestamps for the agent
 *
 * @param transcript - The transcript data
 * @param videoTitle - Title of the video for context
 * @returns Formatted transcript string
 */
export function formatTranscriptForAgent(
  transcript: TranscriptData,
  videoTitle: string
): string {
  const lines: string[] = [
    `Video: ${videoTitle}`,
    `Language: ${transcript.detected_language || "unknown"}`,
    "",
    "Transcript:",
    "",
  ];

  for (const segment of transcript.segments) {
    const timestamp = formatTimestamp(segment.start);
    lines.push(`[${timestamp}] ${segment.text.trim()}`);
  }

  return lines.join("\n");
}
