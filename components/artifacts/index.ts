import type { UIArtifact } from "@/components/chat/artifact";
import {
  type DocumentArtifactKind,
  documentArtifactDefinitions,
} from "./document";
import { type MediaArtifactKind, mediaArtifactDefinitions } from "./media";

/**
 * All artifact definitions combined
 */
export const artifactDefinitions = [
  ...documentArtifactDefinitions,
  ...mediaArtifactDefinitions,
];

// All artifact kinds
export type ArtifactKind = DocumentArtifactKind | MediaArtifactKind;

// UIArtifact types for different categories
export type DocumentUIArtifact = UIArtifact<DocumentArtifactKind, string>;
export type MediaUIArtifact = UIArtifact<MediaArtifactKind, string>;
