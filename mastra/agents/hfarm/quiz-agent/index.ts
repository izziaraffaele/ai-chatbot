import { Agent } from "@mastra/core/agent";
import { QUIZ_AGENT_SYSTEM_PROMPT } from "./system-prompt";

/**
 * H-FARM Quiz Agent
 *
 * Sub-agent specialized in generating quiz questions from provided content.
 * Called by the main H-FARM Assistant when users request a quiz.
 *
 * Purpose:
 * - Generate multiple-choice quiz questions from video transcripts
 * - Create quizzes on specific topics
 * - Produce educational assessment content
 *
 * Configuration:
 * - Uses createActivity client tool (available at runtime via clientTools)
 * - Model: gpt-5-chat-latest for high-quality question generation
 *
 * The quiz agent will call the `createActivity` tool with type "quiz" to
 * render the interactive quiz widget in the chat UI.
 */
export const quizAgent = new Agent({
  name: "Quiz Generator",
  description: `Expert quiz generator that creates educational multiple-choice questions.
    Use this agent when users ask for a quiz, test, or assessment about any topic.
    Provide the content or topic to quiz on as context.
    The agent will generate 5-10 well-crafted questions with explanations and display them as an interactive quiz widget.`,
  instructions: QUIZ_AGENT_SYSTEM_PROMPT,
  model: "openai/gpt-5-chat-latest",
});
