import { describe, expect, test } from "vitest";
import { buildSearchText, type FileIndexData } from "../../lib/sibac/indexer";

// Regex patterns for tests
const MULTIPLE_SPACES_REGEX = /\s{2,}/;
const LEADING_WHITESPACE_REGEX = /^\s/;
const TRAILING_WHITESPACE_REGEX = /\s$/;

describe("SIBAC Indexer", () => {
  describe("buildSearchText", () => {
    test("includes name and path", () => {
      const data: Partial<FileIndexData> & { name: string; path: string } = {
        name: "invoice.xml",
        path: "2024/01/invoice.xml",
      };

      const searchText = buildSearchText(data);

      expect(searchText).toContain("invoice.xml");
      expect(searchText).toContain("2024/01/invoice.xml");
    });

    test("normalizes to lowercase", () => {
      const data = {
        name: "INVOICE.XML",
        path: "Path/To/FILE.xml",
      };

      const searchText = buildSearchText(data);

      expect(searchText).toBe("invoice.xml path/to/file.xml");
    });

    test("collapses whitespace", () => {
      const data = {
        name: "invoice  file.xml",
        path: "path/invoice  file.xml",
      };

      const searchText = buildSearchText(data);

      // Should not have multiple consecutive spaces
      expect(searchText).not.toMatch(MULTIPLE_SPACES_REGEX);
    });

    test("trims the result", () => {
      const data = {
        name: "  invoice.xml  ",
        path: "  path/invoice.xml  ",
      };

      const searchText = buildSearchText(data);

      expect(searchText).not.toMatch(LEADING_WHITESPACE_REGEX);
      expect(searchText).not.toMatch(TRAILING_WHITESPACE_REGEX);
    });

    test("handles special characters in data", () => {
      const data = {
        name: "invoice_2024.xml",
        path: "folder-name/sub_folder/invoice_2024.xml",
      };

      const searchText = buildSearchText(data);

      expect(searchText).toContain("invoice_2024.xml");
      expect(searchText).toContain("folder-name/sub_folder");
    });

    test("handles Italian invoice filenames", () => {
      const data = {
        name: "IT01234567890_abc12.xml",
        path: "2024/01/IT01234567890_abc12.xml",
      };

      const searchText = buildSearchText(data);

      // P.IVA in filename should be searchable
      expect(searchText).toContain("it01234567890");
      expect(searchText).toContain("abc12");
    });
  });
});
