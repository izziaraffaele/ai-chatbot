"use client";
import type { ClientTool } from "@mastra/client-js";
import { useEffect } from "react";
import type { ZodType } from "zod";
import { useClientTools } from "./use-client-tools";

/**
 * React hook for registering an assistant action in a component.
 * Automatically registers the action on mount and deregisters it on unmount.
 *
 * This is the recommended way to add custom actions to the assistant from within
 * React components. The hook handles lifecycle management automatically.
 *
 * @param action - The assistant action (client tool) to register
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const myCustomAction = createTool({
 *     id: 'myAction',
 *     description: 'Does something cool',
 *     inputSchema: z.object({ input: z.string() }),
 *     execute: async ({ context }) => {
 *       return { result: `Processed: ${context.input}` };
 *     },
 *   });
 *
 *   // Register the action - automatically deregisters on unmount
 *   useAssistantAction(myCustomAction);
 *
 *   return <div>Component with custom action</div>;
 * }
 * ```
 *
 * @remarks
 * - Actions are registered on component mount and deregistered on unmount
 * - Multiple components can register actions; each is deregistered only when its component unmounts
 * - If multiple hooks try to register actions with the same ID, the latest registration wins
 * - Actions are not available to the agent until after component mount
 * - Deregistration is idempotent; it's safe to call even if already deregistered
 */
export function useAssistantAction<
  INPUT extends ZodType | undefined,
  OUTPUT extends ZodType | undefined,
>(action: ClientTool<INPUT, OUTPUT>): void {
  const registry = useClientTools();

  useEffect(() => {
    // Register action on mount
    registry.register(action);

    // Cleanup: deregister action on unmount
    return () => {
      registry.deregister(action.id);
    };
  }, [action, registry]);
}
