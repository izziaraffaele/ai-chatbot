'use client';

import { createTool, type ClientTool } from '@mastra/client-js';
import { InferUITools } from 'ai';
import { z } from 'zod';

export { ClientTool };

/**
 * Example client tool: Copy text to clipboard.
 * This demonstrates basic client tool functionality that runs in the browser.
 */
export const copyToClipboardTool = createTool({
  id: 'copyToClipboard',
  description: "Copies text to the user's clipboard",
  inputSchema: z.object({
    text: z.string().describe('The text to copy to clipboard'),
  }),
  execute: async ({ context }) => {
    try {
      await navigator.clipboard.writeText(context.text);
      return {
        success: true,
        message: 'Text copied to clipboard',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to copy to clipboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Client tools registry containing all available client-side tools.
 * Tools are registered here and made available to the Mastra agent via useChat.
 */
export const clientToolsRegistry = {
  copyToClipboard: copyToClipboardTool,
} as const;

/**
 * Get all registered client tools as an object.
 * This is used to pass tools to the Mastra agent.
 */
export function getClientTools() {
  return clientToolsRegistry;
}

/**
 * Type helper to get the client tools object type.
 * Useful for typing components that use client tools.
 */
export type ClientToolsRegistry = typeof clientToolsRegistry;
