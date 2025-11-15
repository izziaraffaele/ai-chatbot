"use client";

import type { ClientTool } from "@mastra/client-js";
import type { ToolsInput } from "@mastra/core/agent";
import z from "zod";

export type AnyClientTool = ClientTool<any, any>;

/**
 * Dynamic registry for assistant actions (client-side tools).
 * Supports runtime registration and deregistration of actions from React components.
 */
export type AssistantActionsRegistry = {
  /**
   * Register an assistant action to make it available to the agent.
   * If an action with the same ID exists, it will be replaced.
   */
  register(action: AnyClientTool): void;

  /**
   * Deregister an assistant action by ID.
   * Safe to call multiple times for the same ID (idempotent).
   */
  deregister(id: string): void;

  /**
   * Get all currently registered assistant actions as an object.
   * Returns an object keyed by action ID, suitable for passing to the Mastra agent.
   */
  getTools(): Record<string, AnyClientTool>;
};

/**
 * Create a new assistant actions registry instance.
 * Maintains an in-memory Map of registered actions.
 */
function createAssistantActionsRegistry(): AssistantActionsRegistry {
  const actions = new Map<string, AnyClientTool>();

  return {
    register(action: AnyClientTool): void {
      actions.set(action.id, action);
    },

    deregister(id: string): void {
      // Idempotent: safe to call multiple times
      actions.delete(id);
    },

    getTools(): Record<string, AnyClientTool> {
      const tools: Record<string, AnyClientTool> = {};
      actions.forEach((action, id) => {
        tools[id] = action;
      });
      return tools;
    },
  };
}

/**
 * Global singleton instance of the assistant actions registry.
 * Maintains all registered actions throughout the application lifecycle.
 */
const assistantActionsRegistry = createAssistantActionsRegistry();

/**
 * Get the assistant actions registry.
 * Used by hooks and components to register/deregister actions.
 *
 * @returns The global assistant actions registry
 */
export function getAssistantActionsRegistry(): AssistantActionsRegistry {
  return assistantActionsRegistry;
}

/**
 * Clear all registered assistant actions.
 * Useful for testing; resets to clean state.
 *
 * @internal For testing only
 */
export function clearAssistantActionsRegistry(): void {
  const tools = assistantActionsRegistry.getTools();
  for (const id of Object.keys(tools)) {
    assistantActionsRegistry.deregister(id);
  }
}

/**
 * Serialize client tools to JSON schema format for API transmission.
 * Converts Zod schemas to JSON schema and prepares tools for the Mastra agent.
 *
 * @param clientTools - Registry of client tools to serialize
 * @returns Serialized tools with JSON schemas for API transmission
 */
export function serializeClientTools(clientTools: ToolsInput): ToolsInput {
  return Object.fromEntries(
    Object.entries(clientTools).map(([key, value]) => {
      return [
        key,
        {
          ...value,
          inputSchema: value.inputSchema
            ? z.toJSONSchema(value.inputSchema)
            : undefined,
          outputSchema: value.outputSchema
            ? z.toJSONSchema(value.outputSchema)
            : undefined,
        },
      ];
    })
  );
}

/**
 * Tool call object received from useChat hook's onToolCall callback.
 */
export type ClientToolCall<T extends string, INPUT = unknown> = {
  /** Name of the tool being called */
  toolName: T;
  /** Unique identifier for this tool invocation */
  toolCallId: string;
  /** Input parameters for the tool */
  input: INPUT;
  /** Whether this is a dynamic tool (should not be processed by us) */
  dynamic?: boolean;
};

/**
 * Result object returned by tool execution, compatible with useChat's addToolOutput().
 */
export type ClientToolCallResult<T extends string, OUTPUT = unknown> = {
  /** The tool call ID */
  toolCallId: string;
  /** Name of the tool that was called */
  tool: T;
  /** Output/result from the tool execution */
  output: OUTPUT | { error?: string };
};

/**
 * Process a client tool call from the useChat hook.
 * Executes the registered client tool and returns the result.
 *
 * Per Vercel AI SDK guidance:
 * - Always check toolCall.dynamic first (for type narrowing)
 * - Don't await addToolResult() (can cause deadlocks)
 *
 * @param toolCall - Tool invocation from useChat onToolCall callback
 * @returns Tool execution result, or error result if execution fails
 *
 * @example
 * ```typescript
 * const { onToolCall } = useChat({
 *   onToolCall: async ({ toolCall }) => {
 *     if (toolCall.dynamic) return;
 *     const result = await processClientToolCall(toolCall);
 *     addToolResult({
 *       toolCallId: result.toolCallId,
 *       result: result.output,
 *     }); // no await
 *   },
 * });
 * ```
 */
export async function processClientToolCall(
  toolCall: ClientToolCall<any, any>
): Promise<ClientToolCallResult<any, any> | undefined> {
  const { toolName, toolCallId, input, dynamic } = toolCall;

  // Skip dynamic tools - let Vercel AI SDK handle them
  if (dynamic) {
    return;
  }

  try {
    // Look up the tool in the registry
    const registry = getAssistantActionsRegistry();
    const tools = registry.getTools();
    const tool = tools[toolName];

    // Skip unregistered tools - Might be a backed tool call
    if (!tool) {
      return;
    }

    if (!tool.execute) {
      return {
        toolCallId,
        tool: toolName,
        output: null,
      };
    }

    console.info(`[${toolName}][${toolCallId}] Executing tool call...`);
    console.log(`[${toolName}][${toolCallId}] Tool call input:`);
    console.log(input);

    // Execute the tool with the provided input
    // Mastra tools expect { context: input } shape for the execute function
    const output = await tool.execute({ context: input } as any);

    console.info(`[${toolName}][${toolCallId}] Tool call complete.`);
    console.log(`[${toolName}][${toolCallId}] Result:`);
    console.log(output);

    return {
      toolCallId,
      tool: toolName,
      output,
    };
  } catch (error) {
    // Capture execution errors and return them as tool results
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.info(`[${toolName}][${toolCallId}] Tool call error:`);
    console.error(error);

    return {
      toolCallId,
      tool: toolName,
      output: {
        error: `Tool execution failed: ${errorMessage}`,
      },
    };
  }
}
