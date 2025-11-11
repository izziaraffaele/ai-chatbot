import { DemoConfig, DemoConfigSchema } from './demo.schema';

/**
 * Default branding configuration
 * Maintains current "Chat SDK" branding for backwards compatibility
 */
const defaultDemoConfig: DemoConfig = {
  assistant: {
    name: 'Assistant',
    description: 'MemorAIz demo assistant',
    roles: [],
    tone: 'friendly'
  },
  appearance: {
    preset: 'default',
    defaultMode: 'auto'
  },
  chat: {
    suggestions: [],
    features: {
      webSearch: true,
      multimodalInput: true,
      memory: true,
      artifacts: true,
    }
  },
  context: {
    indexes: ['memoraiz', 'demo-courses']
  },
  runtime: {
    experiences: [],
    intents: []
  }
};


/**
 * Get the validated branding configuration
 * Merges default config with environment variable overrides
 */
export function getDemoConfig(): DemoConfig {
	try {
		// Validate and return the configuration
		return DemoConfigSchema.parse(defaultDemoConfig);
	} catch (error) {
		console.error('Branding configuration validation failed:', error);
		throw new Error(
			'Invalid branding configuration. Please check your environment variables and config/branding.ts',
		);
	}
}

/**
 * Export the branding configuration
 * This can be imported and customized in user projects
 */
export const demoConfig = getDemoConfig();
