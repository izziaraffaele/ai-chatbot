import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { MastraVector } from "@mastra/core";
import { type EmbeddingModel, embedMany } from "ai";

// Types from the JSON files
type FiguraPerSettore = {
  denominazione_figura: string;
  descrizione: string;
};

type AdaPerFigura = {
  denominazione_ada: string;
  uc: string;
};

type DettagliAda = {
  capacita: string[];
  conoscenze: string[];
};

type SeedArgs = {
  store: MastraVector;
  model: EmbeddingModel<string>;
  dataDir: string;
  indexName: string;
  cacheFile?: string;
};

type CachedData = {
  embeddings: number[][];
  textsToEmbed: string[];
  lastProcessedIndex: number;
};

type DocumentToEmbed = {
  text: string;
  metadata: {
    type: "figura" | "ada";
    settore?: string;
    denominazioneFigura?: string;
    descrizione?: string;
    denominazioneAda?: string;
    uc?: string;
    capacita?: string[];
    conoscenze?: string[];
  };
};

export async function seed({
  store,
  model,
  dataDir,
  indexName,
  cacheFile = path.join(
    process.cwd(),
    ".mastra/cache/embeddings/figure-professionali-cache.json"
  ),
}: SeedArgs) {
  console.log("Loading professional figures data...");

  // Load all JSON files
  const settoriPath = path.join(dataDir, "settori.json");
  const figurePerSettorePath = path.join(dataDir, "figure_per_settore.json");
  const adaPerFiguraPath = path.join(dataDir, "ada_per_figura.json");
  const dettagliAdaPath = path.join(dataDir, "dettagli_ada.json");

  const [settoriData, figureData, adaData, dettagliData] = await Promise.all([
    fs.readFile(settoriPath, "utf-8"),
    fs.readFile(figurePerSettorePath, "utf-8"),
    fs.readFile(adaPerFiguraPath, "utf-8"),
    fs.readFile(dettagliAdaPath, "utf-8"),
  ]);

  const settori: string[] = JSON.parse(settoriData);
  const figurePerSettore: Record<string, FiguraPerSettore[]> =
    JSON.parse(figureData);
  const adaPerFigura: Record<string, AdaPerFigura[]> = JSON.parse(adaData);
  const dettagliAda: Record<string, DettagliAda> = JSON.parse(dettagliData);

  console.log(`Loaded ${settori.length} settori`);

  // Build documents to embed
  const documents: DocumentToEmbed[] = [];

  // 1. Create documents for each professional figure
  for (const [settore, figure] of Object.entries(figurePerSettore)) {
    for (const figura of figure) {
      const figuraAdas = adaPerFigura[figura.denominazione_figura] || [];
      const adaNames = figuraAdas.map((a) => a.denominazione_ada).join(", ");

      documents.push({
        text: `Settore: ${settore}\nFigura Professionale: ${figura.denominazione_figura}\nDescrizione: ${figura.descrizione}\nADA associate: ${adaNames}`,
        metadata: {
          type: "figura",
          settore,
          denominazioneFigura: figura.denominazione_figura,
          descrizione: figura.descrizione,
        },
      });
    }
  }

  // 2. Create documents for each ADA with details
  for (const [figuraName, adas] of Object.entries(adaPerFigura)) {
    // Find the settore for this figura
    let figuraSettore = "";
    for (const [settore, figure] of Object.entries(figurePerSettore)) {
      if (figure.some((f) => f.denominazione_figura === figuraName)) {
        figuraSettore = settore;
        break;
      }
    }

    for (const ada of adas) {
      const details = dettagliAda[ada.denominazione_ada];
      const capacita = details?.capacita || [];
      const conoscenze = details?.conoscenze || [];

      documents.push({
        text: `ADA: ${ada.denominazione_ada}\nCodice UC: ${ada.uc}\nFigura Professionale: ${figuraName}\nSettore: ${figuraSettore}\nCapacità:\n${capacita.map((c) => `- ${c}`).join("\n")}\nConoscenze:\n${conoscenze.map((c) => `- ${c}`).join("\n")}`,
        metadata: {
          type: "ada",
          settore: figuraSettore,
          denominazioneFigura: figuraName,
          denominazioneAda: ada.denominazione_ada,
          uc: ada.uc,
          capacita,
          conoscenze,
        },
      });
    }
  }

  console.log(`Prepared ${documents.length} documents to embed`);

  const textsToEmbed = documents.map((d) => d.text);

  // Check for cached embeddings
  let embeddings: number[][] = [];
  let startIndex = 0;

  // Ensure cache directory exists
  const cacheDir = path.dirname(cacheFile);
  if (!existsSync(cacheDir)) {
    await fs.mkdir(cacheDir, { recursive: true });
  }

  if (existsSync(cacheFile)) {
    console.log("Found cached embeddings, loading...");
    try {
      const cachedDataRaw = await fs.readFile(cacheFile, "utf-8");
      const cachedData: CachedData = JSON.parse(cachedDataRaw);

      if (cachedData.textsToEmbed.length === textsToEmbed.length) {
        embeddings = cachedData.embeddings;
        startIndex = cachedData.lastProcessedIndex + 1;
        console.log(`Loaded ${embeddings.length} cached embeddings`);
        console.log(`Resuming from index ${startIndex}`);
      } else {
        console.log("Cache doesn't match current data, starting fresh");
      }
    } catch (error) {
      console.log("Error loading cache, starting fresh:", error);
    }
  }

  // Generate missing embeddings in batches
  if (startIndex < textsToEmbed.length) {
    console.log(
      `Generating embeddings for ${textsToEmbed.length - startIndex} documents...`
    );

    const batchSize = 100;
    const remaining = textsToEmbed.slice(startIndex);

    for (let i = 0; i < remaining.length; i += batchSize) {
      const batch = remaining.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(remaining.length / batchSize)}...`
      );

      const { embeddings: batchEmbeddings } = await embedMany({
        model,
        values: batch,
      });

      embeddings.push(...batchEmbeddings);

      // Cache after each batch
      const cacheData: CachedData = {
        embeddings,
        textsToEmbed,
        lastProcessedIndex: startIndex + i + batch.length - 1,
      };

      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    }

    console.log(`Cached ${embeddings.length} embeddings`);
  }

  console.log(`Total embeddings ready: ${embeddings.length}`);

  // Create index if it doesn't exist
  console.log(`Creating index: ${indexName}`);

  try {
    await store.createIndex({
      indexName,
      dimension: 1536,
    });
    console.log("Index created successfully");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("already exists")) {
      console.log("Index already exists, continuing...");
    } else {
      throw error;
    }
  }

  // Prepare metadata for upsert
  console.log("Preparing metadata...");
  const metadata = documents.map((doc, index) => ({
    text: textsToEmbed[index],
    ...doc.metadata,
  }));

  // Upsert embeddings with metadata
  console.log("Upserting embeddings to vector store...");
  await store.upsert({
    indexName,
    vectors: embeddings,
    metadata,
  });
  console.log(`Successfully upserted ${embeddings.length} document embeddings`);

  // Clean up cache file
  console.log("Cleaning up cache file...");
  try {
    if (existsSync(cacheFile)) {
      await fs.unlink(cacheFile);
      console.log("Cache file removed");
    }
  } catch (error) {
    console.log("Note: Could not remove cache file:", error);
  }
}

