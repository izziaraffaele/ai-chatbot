import { PgVector } from "@mastra/pg";

export function getDefaultVectorStore() {
  return new PgVector({
    connectionString: process.env.MASTRA_POSTGRES_URL,
  });
}
