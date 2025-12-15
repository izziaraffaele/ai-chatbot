import path from "node:path";
import { config } from "dotenv";
import { VECTOR_INDEX } from "../constants";
import { getDefaultEmbeddingModel } from "./embeddings";
import { seed as seedSchoolrCatalog } from "./seed/schoolr-catalog";
import { getDefaultVectorStore } from "./store";

config({
  path: ".env.local",
});

const run = async () => {
  const store = getDefaultVectorStore();
  const model = getDefaultEmbeddingModel();

  try {
    await seedSchoolrCatalog({
      model,
      store,
      fileInput: path.join(process.cwd(), "data", "schoolr-lessons.json"),
      indexName: VECTOR_INDEX.schoolr.catalog,
    });
  } catch (e) {
    console.error(e);
  }
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed");
    console.error(err);
    process.exit(1);
  });
