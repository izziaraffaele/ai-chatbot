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
  DocumentSelectorContentWrapper,
  DocumentSelectorUIArtifact,
  FileValidation,
} from "./document-selector";
export type {
  MarkdownViewerArtifactProps,
  MarkdownViewerKind,
  MarkdownViewerProps,
} from "./markdown-viewer";
// Re-export markdown viewer types and components
export {
  MARKDOWN_VIEWER_KIND,
  MarkdownViewer,
  MarkdownViewerArtifact,
} from "./markdown-viewer";
