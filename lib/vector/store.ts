import { PgVector } from "@mastra/pg";

function getVectorStoreConnectionString(): string {
  // Use MASTRA_POSTGRES_URL if set, otherwise fallback to POSTGRES_URL
  const connectionString =
    process.env.MASTRA_POSTGRES_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "Vector store connection string not configured. " +
        "Set MASTRA_POSTGRES_URL or POSTGRES_URL environment variable."
    );
  }

  return connectionString;
}

export function getDefaultVectorStore() {
  return new PgVector({
    connectionString: getVectorStoreConnectionString(),
  });
}
