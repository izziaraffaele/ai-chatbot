import path from "node:path";
import { config } from "dotenv";
import { VECTOR_INDEX } from "../constants";
import { getDefaultEmbeddingModel } from "./embeddings";
import { seed as seedFigureProfessionali } from "./seed/figure-professionali";
import { getDefaultVectorStore } from "./store";

config({
  path: ".env.local",
});

const run = async () => {
  const store = getDefaultVectorStore();
  const model = getDefaultEmbeddingModel();

  // Seed professional figures catalog from Regione Toscana data
  console.log("\n📚 Seeding Figure Professionali catalog...\n");
  await seedFigureProfessionali({
    model,
    store,
    dataDir: path.join(
      process.cwd(),
      "data",
      "output",
      "figureProfessionali Regione Toscana"
    ),
    indexName: VECTOR_INDEX.figureProfessionali.catalog,
  });

  console.log("\n✅ Vector store setup complete!\n");
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Setup failed");
    console.error(err);
    process.exit(1);
  });
