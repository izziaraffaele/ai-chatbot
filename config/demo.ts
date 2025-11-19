import { deepMerge } from "@/lib/utils";
import { type DemoConfig, DemoConfigSchema } from "./demo.schema";

/**
 * Get environment variable defaults for branding configuration
 * These serve as fallbacks when demo config values are not explicitly set
 * Returns a partial config that will be deep merged with schema defaults
 */
function getEnvironmentDefaults(): Record<string, unknown> {
  const envConfig: Record<string, unknown> = {};

  // Assistant configuration
  const assistant: Record<string, unknown> = {};
  if (process.env.NEXT_PUBLIC_ASSISTANT_NAME) {
    assistant.name = process.env.NEXT_PUBLIC_ASSISTANT_NAME;
  }
  if (process.env.NEXT_PUBLIC_ASSISTANT_AVATAR_URL) {
    assistant.avatar = process.env.NEXT_PUBLIC_ASSISTANT_AVATAR_URL;
  }
  if (process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION) {
    assistant.description = process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION;
  }
  if (Object.keys(assistant).length > 0) {
    envConfig.assistant = assistant;
  }

  // Appearance configuration
  const appearance: Record<string, unknown> = {};
  if (process.env.NEXT_PUBLIC_THEME_PRESET) {
    appearance.preset = process.env.NEXT_PUBLIC_THEME_PRESET;
  }
  if (process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE) {
    appearance.defaultMode = process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE;
  }
  if (process.env.NEXT_PUBLIC_FAVICON_URL) {
    appearance.favicon = process.env.NEXT_PUBLIC_FAVICON_URL;
  }
  if (process.env.NEXT_PUBLIC_LOGO_URL) {
    appearance.logo = process.env.NEXT_PUBLIC_LOGO_URL;
  }
  if (process.env.NEXT_PUBLIC_AUTH_LOGO_URL) {
    appearance.authLogo = process.env.NEXT_PUBLIC_AUTH_LOGO_URL;
  }
  if (process.env.NEXT_PUBLIC_OG_IMAGE_URL) {
    appearance.ogImage = process.env.NEXT_PUBLIC_OG_IMAGE_URL;
  }
  if (process.env.NEXT_PUBLIC_CUSTOM_CSS) {
    appearance.customCss = process.env.NEXT_PUBLIC_CUSTOM_CSS;
  }
  if (Object.keys(appearance).length > 0) {
    envConfig.appearance = appearance;
  }

  // Context configuration
  const context: Record<string, unknown> = {};

  const organization: Record<string, unknown> = {};
  if (process.env.NEXT_PUBLIC_ORGANIZATION_NAME) {
    organization.name = process.env.NEXT_PUBLIC_ORGANIZATION_NAME;
  }
  if (process.env.NEXT_PUBLIC_ORGANIZATION_DESCRIPTION) {
    organization.description = process.env.NEXT_PUBLIC_ORGANIZATION_DESCRIPTION;
  }
  if (process.env.NEXT_PUBLIC_ORGANIZATION_URL) {
    organization.websiteUrl = process.env.NEXT_PUBLIC_ORGANIZATION_URL;
  }
  if (Object.keys(organization).length > 0) {
    context.organization = organization;
  }

  const app: Record<string, unknown> = {};
  if (process.env.NEXT_PUBLIC_APP_NAME) {
    app.name = process.env.NEXT_PUBLIC_APP_NAME;
  }
  if (process.env.NEXT_PUBLIC_APP_DESCRIPTION) {
    app.description = process.env.NEXT_PUBLIC_APP_DESCRIPTION;
  }
  if (Object.keys(app).length > 0) {
    context.app = app;
  }

  if (Object.keys(context).length > 0) {
    envConfig.context = context;
  }

  return envConfig;
}

/**
 * Default branding configuration (schema defaults)
 * Serves as the base layer before environment variables and demo config
 */
const schemaDefaults: DemoConfig = {
  assistant: {
    name: "Assistant",
    description: "AI assistant",
    roles: [],
    tone: "friendly",
  },
  appearance: {
    preset: "default",
    defaultMode: "auto",
  },
  chat: {
    suggestions: [
      // General AI Capabilities
      // "Explain quantum computing in simple terms",
      // "Write a Python script to analyze sales data",
      // "Help me write a professional email to a client",
      // "What are the advantages of using Next.js 15?",

      // Document Creation & Artifacts
      // "Create a business plan for a tech startup",
      // "Generate a CSV spreadsheet with monthly budget categories",
      // "Write a markdown guide about React best practices",
      // "Create a Python script for web scraping",

      // Code Generation
      // "Implement Dijkstra's algorithm in Python",
      // "Create a REST API with Express.js",
      // "Write a React component for a todo list",
      // "Generate a data visualization using matplotlib",

      // Research & Analysis
      // "Research the latest trends in AI and machine learning",
      // "Analyze the benefits of remote work vs office work",
      // "Compare different cloud hosting providers",
      // "Summarize key features of modern JavaScript frameworks",

      // Weather & Location Services
      // "What's the weather like in San Francisco?",
      // "Check the current weather in London",
      // "What's the weather forecast for New York this week?",
      // "Is it raining in Tokyo right now?",

      // Complex Problem Solving
      // "Help me debug this TypeScript error: Cannot find module",
      // "Design a database schema for an e-commerce platform",
      // "Create a comprehensive testing strategy for a web app",
      // "Optimize this SQL query for better performance",

      // Educational Content
      "Explain how neural networks work",
      "Teach me about design patterns in software engineering",
      "What are the key principles of clean code?",
      "Introduction to machine learning algorithms",
    ],
    features: {
      webSearch: true,
      multimodalInput: true,
      memory: true,
      artifacts: true,
    },
  },
  context: {
    indexes: ["memoraiz", "demo-courses"],
    knowledgeBase: "none",
  },
  runtime: {
    experiences: [],
    intents: [],
  },
};

/**
 * Get the validated branding configuration
 * Merges in this order: schema defaults < environment variables < demo config overrides
 */
export function getDemoConfig(): DemoConfig {
  try {
    const envDefaults = getEnvironmentDefaults();
    const merged = deepMerge(schemaDefaults, envDefaults);

    // Validate and return the configuration
    return DemoConfigSchema.parse(merged);
  } catch (error) {
    console.error("Branding configuration validation failed:", error);
    throw new Error(
      "Invalid branding configuration. Please check your environment variables and config/demo.ts"
    );
  }
}

/**
 * Export the branding configuration
 * This can be imported and customized in user projects
 */
export const demoConfig = getDemoConfig();
