import { RuntimeContext } from "@mastra/core/runtime-context";
import type { Geo } from "@vercel/functions";
import type { Session } from "next-auth";
import {
  runtimeConfig as defaultRuntimeConfig,
  runtimeConfig,
} from "@/config/runtime";
import {
  type RuntimeConfig,
  RuntimeConfigSchema,
} from "@/config/runtime.schema";
import { deepMerge } from "@/lib/utils";
import type {
  InvoiceMetadata,
  InvoiceValidation,
} from "./knowledge-base-loader";

/**
 * Runtime Context Utilities
 *
 * Provides functions for creating and extracting runtime context values
 * used by Mastra tools and agents.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data about the currently loaded invoice, stored in runtime context.
 * Used by document templates to generate structured documents.
 */
export type LoadedInvoiceContext = {
  /** Metadata extracted from the invoice */
  metadata: InvoiceMetadata;
  /** Validation results for the invoice */
  validation: InvoiceValidation;
  /** Raw XML content of the invoice */
  content: string;
};

/**
 * Content currently being viewed within a complex widget.
 * This represents what the user is actually seeing, which may differ
 * from the tab's artifact content (e.g., a markdown file opened within
 * the Fondazione Browser widget).
 */
export type ViewedContent = {
  /** Title of the viewed content (e.g., filename) */
  title: string;
  /** Optional description or path */
  description?: string;
  /** The actual content being viewed (typically text/markdown) */
  content: string;
  /** Content type hint for the agent */
  contentType?: "markdown" | "text" | "csv" | "json";
};

/**
 * Active tab information from the canvas, stored in runtime context.
 * Used by agents to answer questions about the currently open document.
 */
export type ActiveTabContext = {
  /** Tab title */
  title: string;
  /** Widget kind (text, code, sheet, document-selector, etc.) */
  kind: string;
  /** Document ID for persistence/streaming */
  documentId?: string;
  /** Tab content (string for text/code, array for CSV, etc.) */
  content?: unknown;
  /**
   * Content currently being viewed within a complex widget.
   * When present, this takes priority over `content` for agent awareness.
   * For example, when a user views a markdown file inside the Fondazione Browser,
   * this field contains the markdown content, while `content` has the folder listing.
   */
  viewedContent?: ViewedContent;
};

/**
 * Canvas context containing information about the currently active tab.
 * This allows agents to be aware of what document the user is looking at.
 */
export type CanvasContext = {
  /** The currently active tab, or null if no tab is open */
  activeTab: ActiveTabContext | null;
};

// ============================================================================
// EXTRACTORS: Functions to extract values from RuntimeContext
// ============================================================================

export const getSession = (ctx: RuntimeContext): Session | null => {
  const session = ctx.get("session") as any;

  if (!session || !("user" in session) || !("id" in session.user)) {
    return null;
  }

  return session;
};

export const getGeoHints = (ctx: RuntimeContext): Partial<Geo> | undefined => {
  const geoHints = ctx.get("geoHints") as Partial<Geo> | undefined;
  return geoHints;
};

export const getRuntimeConfig = (ctx: RuntimeContext): RuntimeConfig => {
  const _runtimeConfig = deepMerge(
    defaultRuntimeConfig,
    ctx.get("config") || {}
  );
  return RuntimeConfigSchema.parse(_runtimeConfig);
};

/**
 * Get the currently loaded invoice from runtime context.
 * Returns undefined if no invoice has been loaded in this conversation.
 */
export const getLoadedInvoice = (
  ctx: RuntimeContext
): LoadedInvoiceContext | undefined => {
  return ctx.get("loadedInvoice") as LoadedInvoiceContext | undefined;
};

/**
 * Store a loaded invoice in the runtime context.
 * This makes the invoice available to other tools (like createDocument)
 * for template-based document generation.
 */
export const setLoadedInvoice = (
  ctx: RuntimeContext,
  invoice: LoadedInvoiceContext
): void => {
  ctx.set("loadedInvoice", invoice);
};

/**
 * Get the canvas context (active tab info) from runtime context.
 * Returns undefined if no canvas context has been set.
 */
export const getCanvasContext = (
  ctx: RuntimeContext
): CanvasContext | undefined => {
  return ctx.get("canvasContext") as CanvasContext | undefined;
};

/**
 * Store canvas context in the runtime context.
 * This makes the active tab info available to agents and tools.
 */
export const setCanvasContext = (
  ctx: RuntimeContext,
  canvasContext: CanvasContext
): void => {
  ctx.set("canvasContext", canvasContext);
};

// ============================================================================
// BUILDERS: Functions to create RuntimeContext with injected values
// ============================================================================

/**
 * Creates a Mastra RuntimeContext with injected session and geolocation hints
 *
 * @param session - User session for authentication and user identification
 * @param args.geoHints - Geolocation hints from request for system prompt customization
 * @param args.config - Runtime configuration overrides
 * @param args.canvasContext - Active canvas tab information for document-aware responses
 * @returns RuntimeContext configured with session, geo hints, and canvas context
 *
 * @example
 * ```typescript
 * const runtimeContext = createToolContext(session, {
 *   geoHints: { city: 'Faenza' },
 *   canvasContext: { activeTab: { title: 'Invoice', kind: 'text', content: '...' } }
 * });
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
    config?: Partial<RuntimeConfig>;
    canvasContext?: CanvasContext;
  } = {}
): RuntimeContext {
  const context = new RuntimeContext();
  const { geoHints, config = {}, canvasContext } = args;

  // Inject session for tool authentication and user context
  if (session) {
    context.set("session", session);
  }

  // Inject geolocation hints for system prompt customization
  if (geoHints) {
    context.set("geoHints", geoHints);
  }

  // Inject runtime config
  context.set("config", deepMerge(runtimeConfig, config));

  // Inject canvas context for document-aware responses
  if (canvasContext) {
    context.set("canvasContext", canvasContext);
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
  args: { geoHints?: Partial<Geo>; config?: RuntimeConfig } = {}
): RuntimeContext {
  return createToolContext(null, args);
}
