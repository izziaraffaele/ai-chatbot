'use client';

import { getClientTools, type ClientToolsRegistry } from '@/lib/ai/client-tools';

/**
 * React hook for accessing registered client tools in components.
 * Returns an object containing all available client-side tools.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const clientTools = useClientTools();
 *   // Pass clientTools to the Mastra agent
 * }
 * ```
 */
export function useClientTools(): ClientToolsRegistry {
  return getClientTools();
}
