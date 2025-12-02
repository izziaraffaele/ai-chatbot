/**
 * Fondazione CON IL SUD Knowledge Base Loader
 *
 * Utilities for loading the Fondazione website KB and managing bandi (announcements).
 * - Website KB is loaded once and injected into the agent's system prompt
 * - Bandi metadata is extracted from markdown content (no frontmatter required)
 * - Full bando content is only loaded on demand via the tool
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Paths to knowledge base files
 */
const WEBSITE_KB_PATH = path.join(
  process.cwd(),
  "mastra/knowledgebase/fondazione_con_il_sud/website_kb.md"
);

const BANDI_DIR = path.join(
  process.cwd(),
  "mastra/knowledgebase/fondazione_con_il_sud/bandi"
);

/**
 * Bando status types
 */
export type BandoStatus =
  | "aperto"
  | "chiuso"
  | "scaduto"
  | "in valutazione"
  | "sconosciuto";

/**
 * Bando metadata (no content - used for listing)
 */
export interface BandoMetadata {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  deadline?: string;
  status: BandoStatus;
  fileName: string;
}

/**
 * Load the Fondazione website knowledge base
 * This is injected into the agent's system prompt at initialization
 */
export function loadFondazioneWebsiteKb(): string {
  try {
    return fs.readFileSync(WEBSITE_KB_PATH, "utf8");
  } catch (err) {
    console.error("[Fondazione KB] Impossibile leggere website_kb.md", err);
    return "";
  }
}

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extract the first heading from markdown content
 * Looks for # Heading or ## Heading patterns
 */
function extractFirstHeading(content: string): string | undefined {
  // Match first # or ## heading
  const match = content.match(/^#{1,2}\s+(.+)$/m);
  return match?.[1]?.trim();
}

/**
 * Extract the first meaningful paragraph from markdown content
 * Skips headings and empty lines
 */
function extractFirstParagraph(content: string): string | undefined {
  // Remove headings and split into paragraphs
  const withoutHeadings = content.replace(/^#.+$/gm, "").trim();
  const paragraphs = withoutHeadings.split(/\n{2,}/);

  // Find first non-empty paragraph that isn't a list or table
  const first = paragraphs.find((p) => {
    const trimmed = p.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith("|") && // Not a table
      !trimmed.startsWith("*") && // Not a list
      !trimmed.startsWith("-") && // Not a list
      !trimmed.startsWith("---") // Not a separator
    );
  });

  return first?.replace(/\s+/g, " ").trim();
}

/**
 * Try to extract a deadline from the content
 * Looks for common Italian deadline patterns
 */
function extractDeadline(content: string): string | undefined {
  // Look for patterns like "entro il DD/MM/YYYY" or "entro le ore HH:MM del DD mese YYYY"
  const patterns = [
    /entro\s+(?:il|le ore \d{1,2}:\d{2} del)\s+(\d{1,2}\s+\w+\s+\d{4})/i,
    /scadenza[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
    /(\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return;
}

/**
 * List all bandi with their metadata (no content)
 * Metadata is extracted from the markdown content
 * Looks for .md files in first-level subdirectories of the bandi folder
 */
export function listBandiMetadata(): BandoMetadata[] {
  const bandiFiles: { relativePath: string; fullPath: string }[] = [];

  try {
    // Get all first-level subdirectories
    const entries = fs.readdirSync(BANDI_DIR, { withFileTypes: true });
    const subdirs = entries.filter((e) => e.isDirectory());

    // Look for .md files directly inside each subdirectory (not recursively)
    for (const subdir of subdirs) {
      const subdirPath = path.join(BANDI_DIR, subdir.name);
      const subdirEntries = fs.readdirSync(subdirPath, { withFileTypes: true });
      const mdFiles = subdirEntries.filter(
        (e) => e.isFile() && e.name.endsWith(".md")
      );

      for (const mdFile of mdFiles) {
        bandiFiles.push({
          relativePath: path.join(subdir.name, mdFile.name),
          fullPath: path.join(subdirPath, mdFile.name),
        });
      }
    }
  } catch (err) {
    console.error("[Fondazione KB] Impossibile leggere la cartella bandi", err);
    return [];
  }

  return bandiFiles.map(({ relativePath, fullPath }) => {
    const content = fs.readFileSync(fullPath, "utf8");
    const fileName = path.basename(relativePath);

    // Extract title from first heading or use filename
    const title =
      extractFirstHeading(content) ??
      fileName.replace(/\.md$/, "").replace(/_/g, " ");

    // Extract short description from first paragraph
    const shortDescriptionSource = extractFirstParagraph(content) ?? "";
    const shortDescription =
      shortDescriptionSource.length > 220
        ? `${shortDescriptionSource.slice(0, 217)}...`
        : shortDescriptionSource;

    // Generate ID and slug from filename
    const id = fileName.replace(/\.md$/, "");
    const slug = slugify(title);

    // Try to extract deadline from content
    const deadline = extractDeadline(content);

    // Status defaults to "sconosciuto" since files don't have frontmatter
    const status: BandoStatus = "sconosciuto";

    return {
      id,
      slug,
      title,
      shortDescription,
      status,
      deadline,
      fileName: relativePath, // Store relative path for loading
    };
  });
}

/**
 * Load a single bando by ID, slug, or partial title match
 * Returns both metadata and full content
 */
export function loadBandoByIdOrSlug(
  idOrSlug: string
): { metadata: BandoMetadata; content: string } | null {
  const all = listBandiMetadata();
  const normalized = idOrSlug.toLowerCase().trim();

  // Try exact match on ID first
  let match = all.find((b) => b.id.toLowerCase() === normalized);

  // Then try exact match on slug
  if (!match) {
    match = all.find((b) => b.slug === normalized);
  }

  // Then try partial match on title
  if (!match) {
    match = all.find((b) => b.title.toLowerCase().includes(normalized));
  }

  // Finally try partial match on ID (filename)
  if (!match) {
    match = all.find((b) => b.id.toLowerCase().includes(normalized));
  }

  if (!match) {
    return null;
  }

  const fullPath = path.join(BANDI_DIR, match.fileName);
  const content = fs.readFileSync(fullPath, "utf8");

  return { metadata: match, content };
}
