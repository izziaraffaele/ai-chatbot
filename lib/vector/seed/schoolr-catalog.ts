import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { MastraVector } from "@mastra/core";
import { type EmbeddingModel, embedMany } from "ai";

// Video data structure from your file
type Video = {
  url: string;
  csv_title: string;
  title: string;
  description: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  width: number;
  height: number;
  duration: number;
  status: string;
  embeddings?: number[][];
};

type SeedStoreArgs = {
  store: MastraVector;
  model: EmbeddingModel<string>;
  fileInput: string;
  indexName: string;
  cacheFile?: string; // Optional cache file path
  batchSize?: number; // Process embeddings in batches
};

type CachedData = {
  embeddings: number[][];
  textsToEmbed: string[];
  lastProcessedIndex: number;
};

export async function seed({
  store,
  model,
  fileInput,
  indexName,
  cacheFile = path.join(
    process.cwd(),
    ".mastra/cache/embeddings/embeddings-cache.json"
  ),
}: SeedStoreArgs) {
  // 1. Load videos from file
  console.log("Loading videos from file...");
  const videosData = await fs.readFile(fileInput, "utf-8");

  const videos: Video[] = JSON.parse(videosData);
  console.log(`Loaded ${videos.length} videos`);

  // 2. Prepare text for embedding
  console.log("Preparing text for embeddings...");
  const textsToEmbed = videos.map((video) => {
    return `${video.title}\n\n${video.description}`;
  });

  // 3. Check for cached embeddings
  let embeddings: number[][] = [];
  let startIndex = 0;

  if (existsSync(cacheFile)) {
    console.log("Found cached embeddings, loading...");
    try {
      const cachedDataRaw = await fs.readFile(cacheFile, "utf-8");
      const cachedData: CachedData = JSON.parse(cachedDataRaw);

      // Verify cache is valid for current data
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

  // 4. Generate missing embeddings in batches
  if (startIndex < textsToEmbed.length) {
    console.log(
      `Generating embeddings for ${textsToEmbed.length - startIndex} remaining videos...`
    );

    const { embeddings: batchEmbeddings } = await embedMany({
      model,
      values: textsToEmbed.slice(startIndex),
    });

    embeddings.push(...batchEmbeddings);

    // Cache after each successful batch
    const cacheData: CachedData = {
      embeddings,
      textsToEmbed,
      lastProcessedIndex: textsToEmbed.length,
    };

    await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log(`Cached ${embeddings.length} embeddings`);
  }

  console.log(`Total embeddings ready: ${embeddings.length}`);

  // 5. Create index if it doesn't exist
  console.log(`Creating index: ${indexName}`);

  try {
    await store.createIndex({
      indexName,
      dimension: 1536,
    });
    console.log("Index created successfully");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("Index already exists, continuing...");
    } else {
      throw error;
    }
  }

  // 6. Prepare metadata
  console.log("Preparing metadata...");
  const metadata = videos.map((video, index) => ({
    text: textsToEmbed[index],
    videoId: video.url.replace("https://www.loom.com/share/", ""),
    videoUrl: video.url,
    title: video.title,
    description: video.description,
    duration: video.duration,
    titlePath: video.title.split("/"),
    grade: video.title.split("/")[0] || "",
    subject: video.title.split("/")[1] || "",
    topic: video.title.split("/")[2] || "",
  }));

  // 7. Upsert embeddings with metadata
  console.log("Upserting embeddings to vector store...");
  await store.upsert({
    indexName,
    vectors: embeddings,
    metadata,
  });
  console.log(`Successfully upserted ${embeddings.length} video embeddings`);

  // 8. Clean up cache file after successful completion
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
