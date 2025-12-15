import { ModelRouterEmbeddingModel } from "@mastra/core";

export function getDefaultEmbeddingModel() {
  return new ModelRouterEmbeddingModel("openai/text-embedding-3-small");
}
