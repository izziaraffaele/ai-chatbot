'use client';

import { getAssistantActionsRegistry, type AssistantActionsRegistry } from '@/lib/ai/client-tools';

/**
 * React hook for accessing the assistant actions registry.
 * Returns a registry object with methods to register, deregister, and get actions.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const registry = useClientTools();
 *   const tools = registry.getTools();
 *   // Pass tools to the Mastra agent
 * }
 * ```
 *
 * For simplified registration in components, use `useAssistantAction()` instead:
 * ```tsx
 * function MyComponent() {
 *   useAssistantAction(myCustomAction);
 * }
 * ```
 */
export function useClientTools(): AssistantActionsRegistry {
  return getAssistantActionsRegistry();
}
