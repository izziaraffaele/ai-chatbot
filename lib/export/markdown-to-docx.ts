/**
 * Markdown to DOCX Converter
 *
 * Server-side module that converts Markdown content to Word-compatible .docx files.
 * Uses unified/remark for Markdown parsing and the docx library for DOCX generation.
 *
 * Features:
 * - Headings, bold/italic text, paragraphs
 * - Bullet lists, numbered lists, task lists (checkboxes)
 * - Tables with borders (including special liquidation table formatting)
 * - A4 page size with 2.5cm margins
 * - Times New Roman 12pt default font
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  type ITableCellOptions,
  type ITableOptions,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

// ============================================================================
// Types
// ============================================================================

type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  depth?: number;
  ordered?: boolean;
  checked?: boolean | null;
  align?: (string | null)[];
};

type DocxChild = Paragraph | Table;

// ============================================================================
// Constants
// ============================================================================

const PAGE_WIDTH_TWIPS = convertMillimetersToTwip(210); // A4 width
const MARGIN_TWIPS = convertMillimetersToTwip(25); // 2.5cm margins

// Font sizes in half-points (12pt = 24 half-points)
const FONT_SIZE_NORMAL = 24;
const FONT_SIZE_H1 = 32;
const FONT_SIZE_H2 = 28;
const FONT_SIZE_H3 = 24;

// Liquidation table detection patterns
const FATTURE_TABLE_HEADERS = [
  "CAP/ART",
  "Impegno N.",
  "Impegno Anno",
  "Impegno Atto",
  "Creditore",
  "IBAN",
  "CIG/CUP",
  "Oggetto",
  "N/del",
  "Importo",
  "Scadenza",
];

const CONTRIBUTI_TABLE_HEADERS = [
  "CAP/ART",
  "Impegno N.",
  "Impegno Anno",
  "Impegno Atto",
  "Creditore",
  "IBAN",
  "CIG/CUP",
  "Oggetto",
  "Importo",
  "Ritenuta",
  "Scadenza",
];

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Converts Markdown content to a DOCX file buffer.
 *
 * @param markdown - The Markdown content to convert
 * @param title - Document title (used in metadata)
 * @returns Promise<Buffer> - The DOCX file as a buffer
 */
export async function markdownToDocx(
  markdown: string,
  title: string
): Promise<Buffer> {
  // Parse Markdown to AST
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks);

  const ast = processor.parse(markdown);

  // Convert AST to DOCX elements
  const children = convertNodes(ast.children as MdastNode[]);

  // Create the document
  const doc = new Document({
    title,
    creator: "Faenza Assistant",
    description: "Generated document",
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: FONT_SIZE_NORMAL,
          },
          paragraph: {
            spacing: {
              after: 120, // 6pt after paragraphs
              line: 276, // 1.15 line spacing
            },
          },
        },
        heading1: {
          run: {
            font: "Times New Roman",
            size: FONT_SIZE_H1,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        heading2: {
          run: {
            font: "Times New Roman",
            size: FONT_SIZE_H2,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 200,
              after: 100,
            },
          },
        },
        heading3: {
          run: {
            font: "Times New Roman",
            size: FONT_SIZE_H3,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 160,
              after: 80,
            },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "◦",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 1440, hanging: 360 },
                },
              },
            },
          ],
        },
        {
          reference: "numbered-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2)",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 1440, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIPS,
              height: convertMillimetersToTwip(297), // A4 height
            },
            margin: {
              top: MARGIN_TWIPS,
              right: MARGIN_TWIPS,
              bottom: MARGIN_TWIPS,
              left: MARGIN_TWIPS,
            },
          },
        },
        children,
      },
    ],
  });

  // Generate the DOCX buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

// ============================================================================
// AST to DOCX Conversion
// ============================================================================

/**
 * Convert an array of MDAST nodes to DOCX elements.
 */
function convertNodes(nodes: MdastNode[]): DocxChild[] {
  const result: DocxChild[] = [];

  for (const node of nodes) {
    const converted = convertNode(node);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }

  return result;
}

/**
 * Convert a single MDAST node to DOCX element(s).
 */
function convertNode(node: MdastNode): DocxChild | DocxChild[] | null {
  switch (node.type) {
    case "heading":
      return convertHeading(node);
    case "paragraph":
      return convertParagraph(node);
    case "text":
      return new Paragraph({
        children: [new TextRun(node.value || "")],
      });
    case "list":
      return convertList(node);
    case "table":
      return convertTable(node);
    case "thematicBreak":
      return new Paragraph({
        children: [new TextRun("─".repeat(50))],
        spacing: { before: 200, after: 200 },
      });
    case "blockquote":
      return convertBlockquote(node);
    case "code":
      return convertCodeBlock(node);
    default:
      // For unknown node types, try to convert children
      if (node.children) {
        return convertNodes(node.children);
      }
      return null;
  }
}

/**
 * Convert a heading node.
 */
function convertHeading(node: MdastNode): Paragraph {
  const level = node.depth || 1;
  const headingLevel =
    level === 1
      ? HeadingLevel.HEADING_1
      : level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3;

  return new Paragraph({
    heading: headingLevel,
    children: extractTextRuns(node.children || []),
  });
}

/**
 * Convert a paragraph node.
 */
function convertParagraph(node: MdastNode): Paragraph {
  return new Paragraph({
    children: extractTextRuns(node.children || []),
  });
}

/**
 * Convert a list node (ordered, unordered, or task list).
 */
function convertList(node: MdastNode): Paragraph[] {
  const isOrdered = node.ordered ?? false;
  const items: Paragraph[] = [];

  for (const item of node.children || []) {
    if (item.type === "listItem") {
      const isTaskItem = item.checked !== undefined && item.checked !== null;
      const isChecked = item.checked === true;

      // Get text content from the list item
      const runs = extractTextRuns(item.children || [], true);

      // For task items, prepend checkbox
      if (isTaskItem) {
        const checkbox = isChecked ? "☑ " : "☐ ";
        runs.unshift(new TextRun(checkbox));
      }

      items.push(
        new Paragraph({
          children: runs,
          numbering: isTaskItem
            ? undefined
            : {
                reference: isOrdered ? "numbered-list" : "bullet-list",
                level: 0,
              },
          indent: isTaskItem ? { left: 720 } : undefined,
        })
      );
    }
  }

  return items;
}

/**
 * Convert a blockquote node.
 */
function convertBlockquote(node: MdastNode): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const child of node.children || []) {
    if (child.type === "paragraph") {
      paragraphs.push(
        new Paragraph({
          children: extractTextRuns(child.children || []),
          indent: { left: 720 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 12,
              color: "808080",
            },
          },
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Convert a code block node.
 */
function convertCodeBlock(node: MdastNode): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: node.value || "",
        font: "Courier New",
        size: 20, // 10pt
      }),
    ],
    shading: {
      type: ShadingType.SOLID,
      color: "F5F5F5",
    },
    spacing: { before: 120, after: 120 },
  });
}

/**
 * Convert a table node.
 */
function convertTable(node: MdastNode): Table {
  const rows = node.children || [];
  if (rows.length === 0) {
    return createEmptyTable();
  }

  // Extract header row to check for liquidation table
  const headerRow = rows[0];
  const headerCells = headerRow?.children || [];
  const headerTexts = headerCells.map((cell) => extractPlainText(cell));

  // Check if this is a liquidation table
  const isFattureTable = isLiquidationFattureTable(headerTexts);
  const isContributiTable = isLiquidationContributiTable(headerTexts);

  if (isFattureTable || isContributiTable) {
    return createLiquidationTable(node, isFattureTable);
  }

  // Standard table conversion
  return createStandardTable(node);
}

// ============================================================================
// Table Helpers
// ============================================================================

/**
 * Check if headers match the Fatture table pattern.
 */
function isLiquidationFattureTable(headers: string[]): boolean {
  if (headers.length !== FATTURE_TABLE_HEADERS.length) {
    return false;
  }
  return headers.every(
    (h, i) => h.toLowerCase() === FATTURE_TABLE_HEADERS[i].toLowerCase()
  );
}

/**
 * Check if headers match the Contributi table pattern.
 */
function isLiquidationContributiTable(headers: string[]): boolean {
  if (headers.length !== CONTRIBUTI_TABLE_HEADERS.length) {
    return false;
  }
  return headers.every(
    (h, i) => h.toLowerCase() === CONTRIBUTI_TABLE_HEADERS[i].toLowerCase()
  );
}

/**
 * Create an empty table as fallback.
 */
function createEmptyTable(): Table {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph("")],
          }),
        ],
      }),
    ],
  });
}

/**
 * Create a standard table with borders.
 */
function createStandardTable(node: MdastNode): Table {
  const rows = node.children || [];
  const tableRows: TableRow[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const cells = row.children || [];
    const isHeader = rowIndex === 0;

    const tableCells: TableCell[] = cells.map((cell) => {
      // For headers, extract plain text and create bold runs
      // For data cells, use full text runs with formatting
      const cellText = extractPlainText(cell);
      const cellContent = isHeader
        ? [new TextRun({ text: cellText, bold: true, size: FONT_SIZE_NORMAL })]
        : extractTextRuns(cell.children || []);

      const cellOptions: ITableCellOptions = {
        children: [new Paragraph({ children: cellContent })],
        verticalAlign: VerticalAlign.CENTER,
        shading: isHeader
          ? { type: ShadingType.SOLID, color: "F0F0F0" }
          : undefined,
      };

      return new TableCell(cellOptions);
    });

    tableRows.push(
      new TableRow({
        children: tableCells,
        tableHeader: isHeader,
      })
    );
  }

  const tableOptions: ITableOptions = {
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  };

  return new Table(tableOptions);
}

/**
 * Create a liquidation-style table with grouped headers.
 *
 * For Fatture table:
 * Row 1: CAP/ART | IMPEGNO (spans 3) | CREDITORE (spans 3) | FATTURA (spans 4)
 * Row 2: (empty) | N. | Anno | Atto | Denominazione/sede | IBAN | CIG/CUP | Oggetto | N/del | Importo | Scadenza
 *
 * For Contributi table:
 * Row 1: CAP/ART | IMPEGNO (spans 3) | CREDITORE (spans 3) | CONTRIBUTO/TRASFERIMENTO (spans 4)
 * Row 2: (empty) | N. | Anno | Atto | Denominazione/sede | IBAN | CIG/CUP | Oggetto | Importo | Ritenuta | Scadenza
 */
function createLiquidationTable(
  node: MdastNode,
  isFatture: boolean
): Table {
  const rows = node.children || [];
  const tableRows: TableRow[] = [];

  // Calculate column widths (11 columns for both tables)
  const colWidths = [
    8, // CAP/ART
    6, // N.
    6, // Anno
    6, // Atto
    14, // Denominazione/sede
    14, // IBAN
    10, // CIG/CUP
    12, // Oggetto
    8, // N/del or Importo
    8, // Importo or Ritenuta
    8, // Scadenza
  ];

  const headerShading = { type: ShadingType.SOLID, color: "F0F0F0" };

  // ---- First header row (grouped) ----
  const groupHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      // CAP/ART (rowSpan 2)
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "CAP/ART", bold: true, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
        verticalAlign: VerticalAlign.CENTER,
        shading: headerShading,
        width: { size: colWidths[0], type: WidthType.PERCENTAGE },
      }),
      // IMPEGNO (colSpan 3)
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "IMPEGNO", bold: true, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: headerShading,
      }),
      // CREDITORE (colSpan 3)
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "CREDITORE", bold: true, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        shading: headerShading,
      }),
      // FATTURA or CONTRIBUTO/TRASFERIMENTO (colSpan 4)
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: isFatture ? "FATTURA" : "CONTRIBUTO/TRASFERIMENTO",
                bold: true,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 4,
        verticalAlign: VerticalAlign.CENTER,
        shading: headerShading,
      }),
    ],
  });
  tableRows.push(groupHeaderRow);

  // ---- Second header row (sub-columns) ----
  const subHeaders = isFatture
    ? ["N.", "Anno", "Atto", "Denominazione/sede", "IBAN", "CIG/CUP", "Oggetto", "N/del", "Importo", "Scadenza"]
    : ["N.", "Anno", "Atto", "Denominazione/sede", "IBAN", "CIG/CUP", "Oggetto", "Importo", "Ritenuta", "Scadenza"];

  const subHeaderCells = subHeaders.map(
    (text, i) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, size: 18 })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        shading: headerShading,
        width: { size: colWidths[i + 1], type: WidthType.PERCENTAGE },
      })
  );

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: subHeaderCells,
    })
  );

  // ---- Data rows (skip the original header row) ----
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const cells = row.children || [];

    const tableCells: TableCell[] = cells.map((cell, cellIndex) => {
      const cellContent = extractPlainText(cell);

      return new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: cellContent, size: 20 })],
          }),
        ],
        verticalAlign: VerticalAlign.CENTER,
        width: { size: colWidths[cellIndex], type: WidthType.PERCENTAGE },
      });
    });

    tableRows.push(new TableRow({ children: tableCells }));
  }

  return new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });
}

// ============================================================================
// Text Extraction Helpers
// ============================================================================

/**
 * Extract TextRun elements from child nodes, handling bold/italic/etc.
 */
function extractTextRuns(
  nodes: MdastNode[],
  flattenParagraphs = false
): TextRun[] {
  const runs: TextRun[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(new TextRun(node.value || ""));
        break;
      case "strong":
        for (const child of node.children || []) {
          if (child.type === "text") {
            runs.push(new TextRun({ text: child.value || "", bold: true }));
          } else {
            runs.push(...extractTextRuns([child]));
          }
        }
        break;
      case "emphasis":
        for (const child of node.children || []) {
          if (child.type === "text") {
            runs.push(new TextRun({ text: child.value || "", italics: true }));
          } else {
            runs.push(...extractTextRuns([child]));
          }
        }
        break;
      case "inlineCode":
        runs.push(
          new TextRun({
            text: node.value || "",
            font: "Courier New",
            size: 20,
          })
        );
        break;
      case "link":
        // Just extract text from links
        runs.push(...extractTextRuns(node.children || []));
        break;
      case "paragraph":
        if (flattenParagraphs) {
          runs.push(...extractTextRuns(node.children || []));
        }
        break;
      case "break":
        runs.push(new TextRun({ text: "", break: 1 }));
        break;
      default:
        // Try to get children
        if (node.children) {
          runs.push(...extractTextRuns(node.children));
        }
        break;
    }
  }

  return runs;
}

/**
 * Extract plain text from a node tree.
 */
function extractPlainText(node: MdastNode): string {
  if (node.value) {
    return node.value;
  }

  if (node.children) {
    return node.children.map((child) => extractPlainText(child)).join("");
  }

  return "";
}
