import { runtimeConfig as defaultRuntimeConfig } from '@/config/runtime';
import { RuntimeConfig, RuntimeConfigSchema } from '@/config/runtime.schema';
import { deepMerge } from '@/lib/utils';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { Geo } from '@vercel/functions';
import { Session } from 'next-auth';

/**
 * Runtime Context Utilities
 *
 * Provides functions for creating and extracting runtime context values
 * used by Mastra tools and agents.
 */

// ============================================================================
// EXTRACTORS: Functions to extract values from RuntimeContext
// ============================================================================

export const getSession = (ctx: RuntimeContext): Session | null => {
  const session = ctx.get('session') as any;

  if (!session || !('user' in session) || !('id' in session.user)) {
    return null;
  }

  return session;
};

export const getGeoHints = (ctx: RuntimeContext): Partial<Geo> | undefined => {
  const geoHints = ctx.get('geoHints') as Partial<Geo> | undefined;
  return geoHints;
};

export const getRuntimeConfig = (ctx: RuntimeContext): RuntimeConfig => {
  const runtimeConfig = deepMerge(
    defaultRuntimeConfig,
    ctx.get('config') || {}
  );
  return RuntimeConfigSchema.parse(runtimeConfig);
};

// ============================================================================
// BUILDERS: Functions to create RuntimeContext with injected values
// ============================================================================

/**
 * Creates a Mastra RuntimeContext with injected session and geolocation hints
 *
 * @param session - User session for authentication and user identification
 * @param geoHints - Geolocation hints from request for system prompt customization
 * @returns RuntimeContext configured with session and geo hints
 *
 * @example
 * ```typescript
 * const runtimeContext = createToolContext(session, geoHints);
 *
 * await chatAgent.generate({
 *   messages: [...],
 *   runtimeContext,
 * });
 * ```
 */
export function createToolContext(
  session: Session | null | undefined,
  args: {
    geoHints?: Partial<Geo>;
    config?: RuntimeConfig;
  } = {}
): RuntimeContext {
  const context = new RuntimeContext();
  const { geoHints, config } = args;

  // Inject session for tool authentication and user context
  if (session) {
    context.set('session', session);
  }

  // Inject geolocation hints for system prompt customization
  if (geoHints) {
    context.set('geoHints', geoHints);
  }

  // Inject runtime config
  if (geoHints) {
    context.set('config', config);
  }

  return context;
}

/**
 * Creates a Mastra RuntimeContext with geolocation hints only (no session)
 *
 * Used when executing in guest/anonymous contexts.
 *
 * @param geoHints - Geolocation hints from request
 * @returns RuntimeContext configured with geo hints only
 */
export function createGuestToolContext(
  args: {
    geoHints?: Partial<Geo>;
    config?: RuntimeConfig;
  } = {}
): RuntimeContext {
  return createToolContext(null, args);
}
