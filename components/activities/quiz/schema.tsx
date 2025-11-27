import { z } from "zod";
import type { ModelActivity, UIActivity } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

// Schema for UI components and user interactions
export const UIQuizQuestionSchema = z.object({
  id: z.string(),
  /** Question text - the question being asked */
  question: z.string(),
  /** Available choices for the question */
  choices: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  /** Correct answer - should match one of the choice values */
  correctAnswer: z.string(),
  /** Optional explanation for why the answer is correct */
  explanation: z.string().optional(),
});

// Schema for AI model generation - minimal required fields with auto-generated id
export const ModelQuizQuestionSchema = z.object({
  id: z.string().default(generateUUID),
  question: z
    .string()
    .describe(
      "should be clear, specific, and unambiguous. Avoid double negatives and complex wording. Test one concept at a time."
    ),
  choices: z
    .array(z.string())
    .min(2)
    .max(6)
    .describe(
      "should be plausible but clearly distinguishable. Include common misconceptions as distractors."
    ),
  correctAnswerIndex: z
    .number()
    .describe("must match the numeric index of the correct choice"),
  explanation: z
    .string()
    .describe("provide short but clear reasoning for the correct answer")
    .optional(),
});

// Types for individual quiz questions
export type UIQuizQuestion = z.infer<typeof UIQuizQuestionSchema>;
export type ModelQuizQuestion = z.infer<typeof ModelQuizQuestionSchema>;

// Activity types
export type UIQuizActivity = UIActivity<"quiz", UIQuizQuestion[]>;
export type ModelQuizActivity = ModelActivity<"quiz", ModelQuizQuestion[]>;

// Conversion function from Model to UI
export function toUIQuizActivity({
  payload,
  ...source
}: ModelQuizActivity): UIQuizActivity {
  // Filter out incomplete items during streaming
  const validItems = (payload || []).filter((item): item is ModelQuizQuestion =>
    Boolean(
      item?.id &&
        item?.question &&
        Array.isArray(item?.choices) &&
        item.choices.length >= 2 &&
        typeof item?.correctAnswerIndex === "number"
    )
  );

  return {
    id: generateUUID(),
    objectives: [],
    payload: validItems.map((item) => ({
      id: item.id,
      question: item.question,
      choices: item.choices.map((choice) => ({
        value: choice,
        label: choice,
      })),
      correctAnswer: item.choices[item.correctAnswerIndex] || "",
      explanation: item.explanation,
    })),
    ...source,
  };
}
