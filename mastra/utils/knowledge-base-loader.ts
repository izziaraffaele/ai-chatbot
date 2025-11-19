import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Knowledge Base Loader
 *
 * Loads knowledge base markdown files from the file system
 * and returns them as structured objects for injection into agent prompts.
 */

export type KnowledgeBaseName = "none" | "celio" | "analisi1" | "schoolr";

export interface KnowledgeBase {
  name: string;
  content: string;
}

/**
 * Maps knowledge base names to their file paths
 */
const KNOWLEDGE_BASE_PATHS: Record<
  Exclude<KnowledgeBaseName, "none">,
  string | string[]
> = {
  celio: "mastra/knoledgebase/celio/celio-knowledge-base.md",
  schoolr: [
    "mastra/knoledgebase/schoolr/info.md",
    "mastra/knoledgebase/schoolr/personal.md",
  ],
  analisi1: "mastra/knoledgebase/uploaded_content/analisi1.md",
};

/**
 * Loads a knowledge base by name from the file system
 *
 * @param name - The name of the knowledge base to load
 * @returns Knowledge base object with name and content, or null if "none"
 * @throws Error if the knowledge base cannot be loaded
 *
 * @example
 * ```typescript
 * const kb = loadKnowledgeBase("celio");
 * console.log(kb?.name); // "Celio"
 * console.log(kb?.content); // "# Colle Celio: Base di Conoscenza..."
 * ```
 */
export function loadKnowledgeBase(
  name: KnowledgeBaseName
): KnowledgeBase | null {
  if (name === "none") {
    return null;
  }

  try {
    const paths = KNOWLEDGE_BASE_PATHS[name];
    let content: string;

    if (Array.isArray(paths)) {
      // Load and concatenate multiple files (e.g., Schoolr)
      content = paths
        .map((path) => {
          const fullPath = join(process.cwd(), path);
          return readFileSync(fullPath, "utf-8");
        })
        .join("\n\n---\n\n");
    } else {
      // Load single file
      const fullPath = join(process.cwd(), paths);
      content = readFileSync(fullPath, "utf-8");
    }

    // Create a human-readable name
    const displayName = {
      celio: "Celio",
      schoolr: "Schoolr",
      analisi1: "Analisi 1",
    }[name];

    return {
      name: displayName,
      content,
    };
  } catch (error) {
    console.error(`Failed to load knowledge base "${name}":`, error);
    throw new Error(
      `Failed to load knowledge base "${name}": ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
