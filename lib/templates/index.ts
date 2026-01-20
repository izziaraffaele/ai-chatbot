/**
 * Document Template Registry
 *
 * Central registry for document templates. Provides functionality to:
 * - Register templates for different document types
 * - Find matching templates based on conditions
 * - Render templates with invoice data
 *
 * @example
 * ```typescript
 * import { templateRegistry, renderTemplate } from "@/lib/templates";
 *
 * // Find a matching template
 * const template = templateRegistry.findTemplate("Documento di Liquidazione", invoiceContext);
 *
 * // Render the template
 * if (template) {
 *   const result = renderTemplate(template, invoiceContext);
 *   console.log(result.content);
 * }
 * ```
 */

import type {
  DocumentTemplate,
  RenderedTemplate,
  TemplateContext,
  TemplateRegistryConfig,
} from "./types";

// Re-export types for convenience
export type {
  DocumentTemplate,
  RenderedTemplate,
  TemplateContext,
  TemplateDataMapper,
  TemplateCondition,
  TemplateRegistryConfig,
} from "./types";

/**
 * Regular expression to match template placeholders.
 * Matches {{variableName}} patterns.
 */
const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Template Registry class for managing document templates.
 */
class TemplateRegistry {
  private templates: Map<string, DocumentTemplate> = new Map();
  private config: Required<TemplateRegistryConfig>;

  constructor(config: TemplateRegistryConfig = {}) {
    this.config = {
      defaultPlaceholder: config.defaultPlaceholder ?? "______",
      strictMode: config.strictMode ?? false,
    };
  }

  /**
   * Register a new template.
   * @param template - The template to register
   * @throws Error if a template with the same ID already exists
   */
  register(template: DocumentTemplate): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template with id "${template.id}" already registered`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * Unregister a template by ID.
   * @param id - The template ID to remove
   * @returns true if the template was removed, false if it didn't exist
   */
  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Get a template by ID.
   * @param id - The template ID
   * @returns The template or undefined if not found
   */
  get(id: string): DocumentTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all registered templates.
   * @returns Array of all templates
   */
  getAll(): DocumentTemplate[] {
    return [...this.templates.values()];
  }

  /**
   * Get all templates for a specific artifact kind.
   * @param kind - The artifact kind to filter by
   * @returns Array of matching templates
   */
  getByKind(kind: DocumentTemplate["kind"]): DocumentTemplate[] {
    return this.getAll().filter((t) => t.kind === kind);
  }

  /**
   * Find the best matching template for a given title and context.
   * Templates are evaluated in priority order (highest first).
   *
   * @param title - The document title
   * @param context - Optional invoice context
   * @param kind - Optional artifact kind to filter by
   * @returns The matching template or undefined
   */
  findTemplate(
    title: string,
    context?: TemplateContext,
    kind?: DocumentTemplate["kind"]
  ): DocumentTemplate | undefined {
    // Get candidates, optionally filtered by kind
    let candidates = kind ? this.getByKind(kind) : this.getAll();

    // Sort by priority (highest first)
    candidates = candidates.sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    // Find first matching template
    for (const template of candidates) {
      if (template.condition(title, context)) {
        return template;
      }
    }

    return undefined;
  }

  /**
   * Check if any template matches the given criteria.
   *
   * @param title - The document title
   * @param context - Optional invoice context
   * @param kind - Optional artifact kind to filter by
   * @returns true if a matching template exists
   */
  hasMatchingTemplate(
    title: string,
    context?: TemplateContext,
    kind?: DocumentTemplate["kind"]
  ): boolean {
    return this.findTemplate(title, context, kind) !== undefined;
  }

  /**
   * Get the default placeholder for missing values.
   */
  getDefaultPlaceholder(): string {
    return this.config.defaultPlaceholder;
  }
}

/**
 * Render a template with the given context.
 *
 * @param template - The template to render
 * @param context - The invoice context with data
 * @param defaultPlaceholder - Placeholder for missing values (default: "______")
 * @returns The rendered template result
 */
export function renderTemplate(
  template: DocumentTemplate,
  context: TemplateContext,
  defaultPlaceholder = "______"
): RenderedTemplate {
  // Get variables from the data mapper
  const variables = template.dataMapper(context);
  const missingVariables: string[] = [];

  // Replace all placeholders in the template
  const content = template.template.replaceAll(
    PLACEHOLDER_REGEX,
    (match, variableName: string) => {
      const value = variables[variableName];
      if (value === undefined || value === null || value === "") {
        missingVariables.push(variableName);
        return defaultPlaceholder;
      }
      return value;
    }
  );

  return {
    content,
    templateId: template.id,
    variables,
    missingVariables,
  };
}

/**
 * Extract all placeholder variable names from a template string.
 *
 * @param templateString - The template string to analyze
 * @returns Array of unique variable names
 */
export function extractTemplateVariables(templateString: string): string[] {
  const matches = templateString.matchAll(PLACEHOLDER_REGEX);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return [...variables];
}

/**
 * Singleton instance of the template registry.
 * Use this to register and find templates.
 */
export const templateRegistry = new TemplateRegistry();

/**
 * Helper function to create a template condition that matches keywords in the title.
 * Useful for simple keyword-based template selection.
 *
 * @param keywords - Array of keywords to match (case-insensitive)
 * @param requireContext - If true, requires invoice context to be present
 * @returns A condition function
 */
export function createKeywordCondition(
  keywords: string[],
  requireContext = true
): DocumentTemplate["condition"] {
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  return (title: string, context?: TemplateContext) => {
    // Check if context is required and present
    if (requireContext && !context) {
      return false;
    }

    // Check if any keyword matches the title
    const normalizedTitle = title.toLowerCase();
    return normalizedKeywords.some((keyword) =>
      normalizedTitle.includes(keyword)
    );
  };
}

/**
 * Format a date string to Italian format (DD/MM/YYYY).
 *
 * @param dateString - ISO date string or any parseable date
 * @returns Formatted date string
 */
export function formatDateItalian(dateString?: string): string {
  if (!dateString) {
    return "______";
  }

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString; // Return as-is if invalid
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Format a currency amount to Italian format.
 *
 * @param amount - The numeric amount
 * @param currency - Currency code (default: EUR)
 * @returns Formatted currency string
 */
export function formatCurrencyItalian(
  amount?: number,
  currency = "EUR"
): string {
  if (amount === undefined || amount === null) {
    return "______";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Extract the year from a date string.
 *
 * @param dateString - ISO date string or any parseable date
 * @returns Year as string or undefined
 */
export function extractYear(dateString?: string): string | undefined {
  if (!dateString) {
    return undefined;
  }

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      // Try to extract year from YYYY-MM-DD format
      const match = dateString.match(/^(\d{4})/);
      return match ? match[1] : undefined;
    }
    return date.getFullYear().toString();
  } catch {
    return undefined;
  }
}

