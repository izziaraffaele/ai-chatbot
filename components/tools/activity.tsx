"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import z from "zod";
import {
  getActivityComponent,
  getActivitySchema,
  toChatActivity,
} from "@/components/activities";
import { Player, usePlayer } from "@/components/player";
import { useAssistantAction } from "@/hooks/use-assistant-action";
import { createAttemptStore } from "@/lib/activity-tracking";
import { generateUUID } from "@/lib/utils";
import type { ChatToolProps } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * The core schema used for generation.
 */
export const ActivityToolInputSchema = z.object({
  type: z.enum(["flashcard", "quiz"]),
  /** Title for the activity */
  title: z.string().describe("Short, optimized title for the activity"),
  /** Description for the activity */
  description: z.string().optional().describe("Optional short description"),
  /** Type of activity to create */
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .default("medium")
    .describe("Inferred from user input."),
  /** Learning objectives */
  objectives: z
    .array(z.string())
    .default([])
    .describe(
      "Learning objectives specific to the activity (visible to the user)"
    ),
  content: z.object({
    quiz: getActivitySchema("quiz").optional(),
    flashcard: getActivitySchema("flashcard").optional(),
  }),
});

export type ActivityToolInput = z.infer<typeof ActivityToolInputSchema>;

const ActivityToolOutputSchema = z.object({
  completed: z.boolean(),
  data: z.record(z.string(), z.any()).optional(),
  error: z.string().optional(),
});

/**
 * Activity result format for tool output
 */
export type ActivityToolOutput = z.infer<typeof ActivityToolOutputSchema>;

// ============================================================================
// Activity Tool Context
// ============================================================================

/**
 * Activity tool context for managing promise resolution
 */
type ActivityToolContextValue = {
  /** Resolve an activity with its result */
  resolveActivity: (toolCallId: string, result: ActivityToolOutput) => void;
  rejectActivity: (toolCallId: string, error: string | Error) => void;
  /** Check if an activity has been resolved */
  isResolved: (toolCallId: string) => boolean;
};

const ActivityToolContext = createContext<ActivityToolContextValue | null>(
  null
);

/**
 * Provider for activity tool state management
 */
export function ActivityToolProvider({ children }: React.PropsWithChildren) {
  const promiseRegistry = useRef(
    new Map<
      string,
      {
        resolve: (result: ActivityToolOutput) => void;
        reject: (error: Error) => void;
      }
    >()
  );

  const resolved = useRef(new Set<string>());

  const resolveActivity = useCallback(
    (toolCallId: string, result: ActivityToolOutput) => {
      if (resolved.current.has(toolCallId)) {
        return; // Already resolved
      }

      // validate result
      const output = ActivityToolOutputSchema.parse(result);

      // resolve promise
      const promise = promiseRegistry.current.get(toolCallId);
      promise?.resolve(output);
      promiseRegistry.current.delete(toolCallId);

      resolved.current.add(toolCallId);
    },
    []
  );

  const rejectActivity = useCallback(
    (toolCallId: string, error?: string | Error) => {
      if (resolved.current.has(toolCallId)) {
        return; // Already resolved
      }

      const errorObj = error instanceof Error ? error : new Error(error);

      const promise = promiseRegistry.current.get(toolCallId);
      promise?.reject(errorObj);
      promiseRegistry.current.delete(toolCallId);

      resolved.current.add(toolCallId);
    },
    []
  );

  const isResolved = useCallback((toolCallId: string) => {
    return resolved.current.has(toolCallId);
  }, []);

  useAssistantAction({
    id: "createActivity",
    description:
      "Create interactive learning activities like quizzes and flashcards for the user. When an activity is created is immediately displayed to the user and the result will be returend by this tool",
    inputSchema: ActivityToolInputSchema,
    execute: async (_, opts) => {
      const activityId = generateUUID();
      const toolCallId = opts?.toolCallId || activityId;

      const promise = new Promise<ActivityToolOutput>((resolve, reject) => {
        promiseRegistry.current.set(toolCallId, { resolve, reject });
      });

      const result = await promise;

      // Note: In a real implementation, this would resolve a promise
      // For now, we just track that it's been resolved
      console.log(`Activity ${toolCallId} completed:`, result);

      return result;
    },
  });

  return (
    <ActivityToolContext.Provider
      value={{ isResolved, resolveActivity, rejectActivity }}
    >
      {children}
    </ActivityToolContext.Provider>
  );
}

/**
 * Hook to access activity tool context
 */
export function useActivityTool(): ActivityToolContextValue {
  const context = useContext(ActivityToolContext);
  if (!context) {
    throw new Error(
      "useActivityTool must be used within an ActivityToolProvider"
    );
  }
  return context;
}

// ============================================================================
// Client Tool Definition
// ============================================================================

// ============================================================================
// Tool UI Component
// ============================================================================

/**
 * Tool UI component for rendering activities
 */
export function ActivityTool(props: ChatToolProps) {
  const { part } = props;
  // Extract input from the part
  const input = part.input
    ? (part.input as z.infer<typeof ActivityToolInputSchema>)
    : undefined;

  // Create store for the activity
  const store = useMemo(() => {
    if (!input?.type) {
      return null;
    }
    return createAttemptStore(input.type, part.toolCallId);
  }, [input?.type, part.toolCallId]);

  // TODO: handle loading state better maybe with a skeleton
  // TODO: wrap the loader in a Tool component
  if (!store || !input) {
    return <div>Loading...</div>;
  }

  // TODO: wrap the palyer in a Tool component
  return (
    <Player store={store}>
      <ActivityToolPlayer {...props} />
    </Player>
  );
}

export function ActivityToolPlayer({ part }: ChatToolProps) {
  const { toolCallId } = part;
  const { resolveActivity, isResolved } = useActivityTool();
  const { state } = usePlayer();

  // Extract input from the part
  const input = part.input
    ? (part.input as z.infer<typeof ActivityToolInputSchema>)
    : undefined;

  const activity = useMemo(() => {
    if (!input) {
      return;
    }

    const payload = input.content[input.type];
    if (!payload) {
      return;
    }

    // Create ModelActivity object that the toUI function expects
    const modelActivity = {
      id: part.toolCallId,
      type: input.type,
      payload,
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      objectives: input.objectives,
    };

    return toChatActivity(input.type, modelActivity as any);
  }, [input, part.toolCallId]);

  useEffect(() => {
    if (
      state.currentAttempt?.status === "completed" &&
      !isResolved(toolCallId)
    ) {
      resolveActivity(toolCallId, {
        completed: Boolean(state.currentAttempt.passed),
        data: state.currentAttempt,
      });
    }
  }, [state, isResolved, resolveActivity, toolCallId]);

  const Component = input && getActivityComponent(input.type);
  return Component ? <Component activity={activity} /> : null;
}
