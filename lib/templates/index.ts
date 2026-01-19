/**
 * Template System
 *
 * Provides a registry and rendering infrastructure for document templates.
 * Templates can be used to generate structured documents from data (e.g., invoices).
 */

import type {
  InvoiceMetadata,
  InvoiceValidation,
} from "@/mastra/utils/knowledge-base-loader";

/**
 * Context available to templates for rendering
 */
export type TemplateContext = {
  /** Invoice metadata (supplier, amount, etc.) */
  metadata: InvoiceMetadata;
  /** Invoice validation results */
  validation: InvoiceValidation;
  /** Raw invoice content (XML) */
  content: string;
};

/**
 * Template definition
 */
export type Template = {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Document kind this template produces */
  kind: "text" | "code" | "sheet";
  /** Keywords that trigger this template (matched against document title) */
  keywords: string[];
  /** The template content with {{variable}} placeholders */
  template: string;
  /** Optional validation function to check if template should be used */
  shouldMatch?: (title: string, context: TemplateContext) => boolean;
};

/**
 * Result of rendering a template
 */
export type RenderResult = {
  /** The rendered content with variables replaced */
  content: string;
  /** List of variables that were not found in the context */
  missingVariables: string[];
};

/**
 * Template Registry
 *
 * Manages document templates and provides methods for finding and rendering them.
 */
class TemplateRegistry {
  private templates: Map<string, Template> = new Map();

  /**
   * Register a new template
   */
  register(template: Template): void {
    this.templates.set(template.id, template);
    console.log(`[Templates] Registered template: ${template.id}`);
  }

  /**
   * Get a template by ID
   */
  get(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all registered templates
   */
  getAll(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Find a matching template for a document title and context
   *
   * @param title - Document title to match against
   * @param context - Template context with invoice data
   * @param kind - Document kind to filter by
   * @returns Matching template or undefined
   */
  findTemplate(
    title: string,
    context: TemplateContext,
    kind: "text" | "code" | "sheet"
  ): Template | undefined {
    const normalizedTitle = title.toLowerCase();

    for (const template of this.templates.values()) {
      // Skip if kind doesn't match
      if (template.kind !== kind) {
        continue;
      }

      // Check custom shouldMatch function first
      if (template.shouldMatch) {
        if (template.shouldMatch(title, context)) {
          return template;
        }
        continue;
      }

      // Check keywords against title
      const hasMatchingKeyword = template.keywords.some((keyword) =>
        normalizedTitle.includes(keyword.toLowerCase())
      );

      if (hasMatchingKeyword) {
        return template;
      }
    }

    return undefined;
  }
}

/**
 * Global template registry instance
 */
export const templateRegistry = new TemplateRegistry();

/**
 * Extract variable names from a template string
 * Variables are in the format {{variableName}}
 */
function extractVariables(template: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = variableRegex.exec(template)) !== null) {
    const varName = match[1].trim();
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}

/**
 * Get a value from nested object using dot notation
 * e.g., "metadata.supplier" -> context.metadata.supplier
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Render a template with the given context
 *
 * @param template - Template to render
 * @param context - Context with data to fill in
 * @returns Rendered content and list of missing variables
 */
export function renderTemplate(
  template: Template,
  context: TemplateContext
): RenderResult {
  const variables = extractVariables(template.template);
  const missingVariables: string[] = [];

  let content = template.template;

  for (const varName of variables) {
    const value = getNestedValue(context as unknown as Record<string, unknown>, varName);
    const placeholder = `{{${varName}}}`;

    if (value === undefined || value === null || value === "") {
      missingVariables.push(varName);
      // Replace with placeholder indicator for missing values
      content = content.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        `[${varName}]`
      );
    } else {
      // Replace all occurrences of the placeholder
      content = content.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        String(value)
      );
    }
  }

  return { content, missingVariables };
}


