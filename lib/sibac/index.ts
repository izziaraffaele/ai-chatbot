/**
 * SIBAC Module
 *
 * Provides file indexing and search capabilities for the SIBAC shared folder.
 */

export {
  // Types
  type FileIndexData,
  type FullScanOptions,
  type IncrementalIndexOptions,
  type IndexResult,
  // Functions
  buildSearchText,
  indexFullScanSibacShared,
  indexSibacChanges,
  getIndexVersion,
  incrementIndexVersion,
  getIndexedFileCount,
  clearIndex,
} from "./indexer";
