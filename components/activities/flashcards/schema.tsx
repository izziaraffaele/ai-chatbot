import { z } from "zod";
import type { ModelActivity, UIActivity } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

// Schema for UI components and user interactions
export const UIFlashcardSchema = z.object({
  id: z.string(),
  /** Front side of the flashcard (question/prompt) */
  front: z.string(),
  /** Back side of the flashcard (answer/explanation) */
  back: z.string(),
  /** Optional hint to help the user */
  hint: z.string().optional(),
  /** Optional explanation for the answer */
  explanation: z.string().optional(),
});

// Schema for AI model generation - minimal required fields with auto-generated id
export const ModelFlashcardSchema = z.object({
  id: z.string().default(generateUUID),
  front: z
    .string()
    .describe(
      "should be a clear, concise question or prompt that tests understanding of a key concept. Avoid ambiguity"
    ),
  back: z
    .string()
    .describe(
      "should provide the direct answer followed by a brief explanation if needed. Keep it precise and educational"
    ),
  hint: z
    .string()
    .describe(
      "should guide toward the answer without giving it away. Use for challenging concepts or multi-step problems."
    ),
  explanation: z
    .string()
    .describe(
      "provide minimal context, examples, or the reasoning behind the answer"
    )
    .optional(),
});

// Types for individual flashcards
export type UIFlashcard = z.infer<typeof UIFlashcardSchema>;
export type ModelFlashcard = z.infer<typeof ModelFlashcardSchema>;

// Activity types
export type UIFlashcardActivity = UIActivity<"flashcard", UIFlashcard[]>;
export type ModelFlashcardActivity = ModelActivity<
  "flashcard",
  ModelFlashcard[]
>;

// Conversion function from Model to UI
export function toUIFlashcardActivity({
  payload,
  ...source
}: ModelFlashcardActivity): UIFlashcardActivity {
  // Filter out incomplete items during streaming
  const validItems = (payload || []).filter(
    (item): item is ModelFlashcard =>
      Boolean(item?.id && item?.front && item?.back)
  );

  return {
    id: generateUUID(),
    objectives: [],
    payload: validItems.map((item) => ({
      id: item.id,
      front: item.front,
      back: item.back,
      hint: item.hint,
      explanation: item.explanation,
    })),
    ...source,
  };
}
