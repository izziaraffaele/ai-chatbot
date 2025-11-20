import { z } from "zod";
import type { ModelActivity, UIActivity } from "@/lib/types";
// Import activity components and schemas
import { FlashcardActivity } from "./flashcards";
import {
  ModelFlashcardSchema,
  toUIFlashcardActivity,
} from "./flashcards/schema";
import { QuizActivity } from "./quiz";
import { ModelQuizQuestionSchema, toUIQuizActivity } from "./quiz/schema";

// ============================================================================
// Types
// ============================================================================

/**
 * Activity type definition for the registry
 */
export type ActivityType<
  TYPE extends string,
  INPUT = unknown,
  DATA = unknown,
> = {
  type: TYPE;
  /** Component that renders the activity */
  Component: React.ComponentType<any>; // Use any for now to handle complex prop types
  /** Schema for model generation (AI input) - single item */
  schema: z.ZodType<INPUT>;
  /** Function to convert model payload array to UI payload array */
  toUI: (source: ModelActivity<TYPE, INPUT>) => UIActivity<TYPE, DATA>;
};

function defineActivity<TYPE extends string, INPUT = unknown, DATA = unknown>(
  def: ActivityType<TYPE, INPUT, DATA>
): ActivityType<TYPE, INPUT, DATA> {
  return def;
}

// ============================================================================
// Activity Registry
// ============================================================================
/**
 * Registry of all available activity types with their components, schemas, and parsers
 */
export const activities = {
  flashcard: defineActivity({
    type: "flashcard",
    Component: FlashcardActivity,
    schema: z.array(ModelFlashcardSchema),
    toUI: toUIFlashcardActivity,
  }),
  quiz: defineActivity({
    type: "quiz",
    Component: QuizActivity,
    schema: z.array(ModelQuizQuestionSchema),
    toUI: toUIQuizActivity,
  }),
};

type ChatActivityRegistry = typeof activities;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Union type of all available activity type keys
 */
export type ChatActivityType =
  ChatActivityRegistry[keyof ChatActivityRegistry]["type"];

/**
 * Get component for a specific activity type
 */
export function getActivityComponent<K extends ChatActivityType>(
  type: K
): ChatActivityRegistry[K]["Component"] {
  return activities[type].Component;
}

/**
 * Get schema for a specific activity type
 */
export function getActivitySchema<K extends ChatActivityType>(
  type: K
): ChatActivityRegistry[K]["schema"] {
  return activities[type].schema;
}

/**
 * Get parser function for a specific activity type
 */
export function toChatActivity<K extends ChatActivityType>(
  type: K,
  data: Parameters<ChatActivityRegistry[K]["toUI"]>[0]
): ReturnType<ChatActivityRegistry[K]["toUI"]> {
  return activities[type].toUI(data as any) as any;
}
