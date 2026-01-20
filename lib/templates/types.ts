/**
 * Document Template System Types
 *
 * Provides type definitions for the template-based document generation system.
 * Templates allow generating structured documents (like "Documento di Liquidazione")
 * using data extracted from loaded invoices.
 */

import type {
  InvoiceMetadata,
  InvoiceValidation,
} from "@/mastra/utils/knowledge-base-loader";

/**
 * Data context available to templates when rendering.
 * Contains all information about the currently loaded invoice.
 */
export type TemplateContext = {
  /** Metadata extracted from the invoice */
  metadata: InvoiceMetadata;
  /** Validation results for the invoice */
  validation: InvoiceValidation;
  /** Raw XML content of the invoice (optional, for advanced parsing) */
  content?: string;
  /** Additional custom data that can be passed to templates */
  custom?: Record<string, unknown>;
};

/**
 * A function that maps invoice data to template variables.
 * Returns a record of variable names to their string values.
 */
export type TemplateDataMapper = (
  context: TemplateContext
) => Record<string, string>;

/**
 * Condition function to determine if a template should be used.
 * Can check the title, context, or other factors.
 */
export type TemplateCondition = (
  title: string,
  context?: TemplateContext
) => boolean;

/**
 * Defines a document template with its content and data mapping.
 */
export type DocumentTemplate = {
  /** Unique identifier for the template */
  id: string;

  /** Human-readable name for the template (Italian) */
  name: string;

  /** Description of what this template is for (Italian) */
  description: string;

  /** The artifact kind this template produces */
  kind: "text" | "code" | "sheet";

  /**
   * Function to determine if this template should be used.
   * Receives the document title and optional context.
   */
  condition: TemplateCondition;

  /**
   * The template content with placeholders in the format {{variableName}}.
   * Placeholders will be replaced with values from the data mapper.
   */
  template: string;

  /**
   * Function to map invoice context to template variables.
   * Should return all variables used in the template.
   */
  dataMapper: TemplateDataMapper;

  /**
   * Priority for template selection (higher = more specific).
   * When multiple templates match, the highest priority wins.
   * Default: 0
   */
  priority?: number;
};

/**
 * Result of rendering a template.
 */
export type RenderedTemplate = {
  /** The rendered content with all placeholders replaced */
  content: string;
  /** The template that was used */
  templateId: string;
  /** Variables that were used in rendering */
  variables: Record<string, string>;
  /** Any variables that were missing (had no value) */
  missingVariables: string[];
};

/**
 * Configuration for the template registry.
 */
export type TemplateRegistryConfig = {
  /** Default placeholder for missing values (default: "______") */
  defaultPlaceholder?: string;
  /** Whether to throw an error if a required variable is missing */
  strictMode?: boolean;
};

