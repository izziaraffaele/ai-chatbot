import type { UIArtifact } from "@/components/chat/artifact";
import {
  type DocumentArtifactKind,
  documentArtifactDefinitions,
} from "./document";
import type { DocumentSelectorArtifactKind } from "./document-selector";
import type { MarkdownViewerKind } from "./markdown-viewer";
import { type MediaArtifactKind, mediaArtifactDefinitions } from "./media";

/**
 * All artifact definitions combined
 */
export const artifactDefinitions = [
  ...documentArtifactDefinitions,
  ...mediaArtifactDefinitions,
];

// All artifact kinds
export type ArtifactKind =
  | DocumentArtifactKind
  | MediaArtifactKind
  | DocumentSelectorArtifactKind
  | MarkdownViewerKind;

// UIArtifact types for different categories
export type DocumentUIArtifact = UIArtifact<DocumentArtifactKind, string>;
export type MediaUIArtifact = UIArtifact<MediaArtifactKind, string>;
export type MarkdownViewerUIArtifact = UIArtifact<MarkdownViewerKind, string>;

// Re-export document selector types
export type {
  DocumentSelectorUIArtifact,
  FileValidation,
} from "./document-selector";

// Re-export markdown viewer types and components
export {
  MarkdownViewer,
  MarkdownViewerArtifact,
  MARKDOWN_VIEWER_KIND,
} from "./markdown-viewer";
export type {
  MarkdownViewerKind,
  MarkdownViewerProps,
  MarkdownViewerArtifactProps,
} from "./markdown-viewer";
