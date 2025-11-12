import { deepMerge } from '@/lib/utils';
import { type DemoConfig, DemoConfigSchema } from './demo.schema';
import { RuntimeConfig, RuntimeConfigSchema } from './runtime.schema';

/**
 * Get environment variable defaults for runtime configuration
 * These serve as fallbacks when runtime config values are not explicitly set
 * Returns a partial config that will be deep merged with schema defaults
 */
function getEnvironmentDefaults(): Record<string, unknown> {
  const envConfig: Record<string, unknown> = {};

  // Assistant configuration
  const assistant: Record<string, unknown> = {};
  if (process.env.NEXT_PUBLIC_ASSISTANT_NAME)
    assistant.name = process.env.NEXT_PUBLIC_ASSISTANT_NAME;
  if (process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION)
    assistant.description = process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION;
  if (Object.keys(assistant).length > 0) envConfig.assistant = assistant;

  // Tenant configuration
  const tenant: Record<string, unknown> = { id: 'test' };
  if (process.env.NEXT_PUBLIC_ORGANIZATION_NAME)
    tenant.name = process.env.NEXT_PUBLIC_ORGANIZATION_NAME;
  if (process.env.NEXT_PUBLIC_ORGANIZATION_DESCRIPTION)
    tenant.description = process.env.NEXT_PUBLIC_ORGANIZATION_DESCRIPTION;
  if (Object.keys(tenant).length > 0) tenant.organization = tenant;

  // Environment configuration
  const environment: Record<string, unknown> = {};

  const site: Record<string, unknown> = {};
  if (tenant.name && process.env.NEXT_PUBLIC_ORGANIZATION_URL) {
    site.title = `${tenant.name} Site`;
    site.description = `${tenant.name}'s main webiste`;
    site.url = process.env.NEXT_PUBLIC_ORGANIZATION_URL;
    if (site.url) environment.site = site;
  }

  // const app: Record<string, unknown> = {};
  // if (process.env.NEXT_PUBLIC_APP_NAME)
  //   app.name = process.env.NEXT_PUBLIC_APP_NAME;
  // if (process.env.NEXT_PUBLIC_APP_DESCRIPTION)
  //   app.description = process.env.NEXT_PUBLIC_APP_DESCRIPTION;
  // if (Object.keys(app).length > 0) context.app = app;

  if (Object.keys(environment).length > 0) envConfig.environment = environment;

  return envConfig;
}

/**
 * Default branding configuration (schema defaults)
 * Serves as the base layer before environment variables and demo config
 */
const schemaDefaults: RuntimeConfig = {
  assistant: {
    name: 'Assistant',
    description: 'AI assistant',
    tone: 'friendly',
    roles: [],
  },
  organization: {
    name: 'Demo',
  },
  features: {
    webSearch: true,
    multimodalInput: true,
    memory: true,
    artifacts: true,
  },
  environment: {},
  experiences: [],
  intents: [],
};

/**
 * Get the validated branding configuration
 * Merges in this order: schema defaults < environment variables < demo config overrides
 */
export function getDefaultRuntimeConfig(): RuntimeConfig {
  try {
    const envDefaults = getEnvironmentDefaults();
    // Validate and return the configuration (defaults are applied by zod)
    return RuntimeConfigSchema.parse(deepMerge(schemaDefaults, envDefaults));
  } catch (error) {
    console.error('Branding configuration validation failed:', error);
    throw new Error(
      'Invalid branding configuration. Please check your environment variables and config/demo.ts'
    );
  }
}

/**
 * Export the branding configuration
 * This can be imported and customized in user projects
 */
export const runtimeConfig = getDefaultRuntimeConfig();
