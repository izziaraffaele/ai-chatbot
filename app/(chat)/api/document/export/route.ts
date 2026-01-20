/**
 * Document Export API
 *
 * Exports documents as Word-compatible files:
 * - format=docx: True DOCX format (OpenXML, recommended)
 * - format=doc: Legacy HTML-wrapped .doc format
 *
 * GET /api/document/export?id=DOC_ID&format=docx
 * GET /api/document/export?id=DOC_ID&format=doc (legacy)
 */

import { auth } from "@/app/(auth)/auth";
import { getDocumentsById } from "@/lib/db/queries";
import type { Document } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { markdownToDocx } from "@/lib/export/markdown-to-docx";

/**
 * UUID v4 regex pattern for validating document IDs.
 */
const UUID_REGEX =
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Wraps HTML content in a Word-compatible document structure.
 * This wrapper ensures proper rendering in Microsoft Word when saved as .doc.
 */
function wrapHtmlForWord(htmlContent: string, title: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta name="ProgId" content="Word.Document" />
  <meta name="Generator" content="Faenza Assistant" />
  <meta name="Originator" content="Faenza Assistant" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <o:DocumentProperties>
      <o:Title>${escapeHtml(title)}</o:Title>
    </o:DocumentProperties>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    /* Reset and base styles for Word compatibility */
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.5;
      margin: 2.5cm;
    }
    
    /* Table styles */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    
    td, th {
      border: 1px solid #000;
      padding: 8px;
      vertical-align: top;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    /* Heading styles */
    h1, h2, h3, h4, h5, h6 {
      font-family: "Times New Roman", serif;
      margin-top: 12pt;
      margin-bottom: 6pt;
    }
    
    h1 { font-size: 16pt; }
    h2 { font-size: 14pt; }
    h3 { font-size: 12pt; }
    
    /* Paragraph styles */
    p {
      margin: 6pt 0;
    }
    
    /* List styles */
    ul, ol {
      margin-left: 20pt;
    }
    
    /* Page break class */
    .page-break {
      page-break-after: always;
    }
    
    /* Print styles */
    @page {
      size: A4;
      margin: 2.5cm;
    }
    
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

/**
 * Converts Markdown content to basic HTML.
 * This is a simple conversion for common markdown elements.
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first (but not in already-HTML content)
  if (!html.includes("<div") && !html.includes("<table")) {
    html = escapeHtml(html);
  }

  // Headers (after escaping to preserve #)
  html = html.replaceAll(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replaceAll(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replaceAll(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replaceAll(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replaceAll(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replaceAll(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replaceAll(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replaceAll(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replaceAll(/\*(.+?)\*/g, "<em>$1</em>");

  // Horizontal rules
  html = html.replaceAll(/^---+$/gm, "<hr />");

  // Line breaks (double newline = paragraph)
  html = html.replaceAll(/\n\n/g, "</p><p>");

  // Wrap in paragraphs if not already HTML
  if (!html.startsWith("<")) {
    html = `<p>${html}</p>`;
  }

  return html;
}

/**
 * Escapes HTML special characters to prevent XSS and ensure proper rendering.
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Sanitizes filename for Content-Disposition header.
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are problematic in filenames
  return filename
    .replaceAll(/[<>:"/\\|?*]/g, "_")
    .replaceAll(/\s+/g, "_")
    .slice(0, 200); // Limit length
}

/**
 * Detects if content is already HTML or needs markdown conversion.
 */
function isHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith("<") ||
    trimmed.includes("<div") ||
    trimmed.includes("<table") ||
    trimmed.includes("<p>") ||
    trimmed.includes("<html")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const format = searchParams.get("format") || "docx";

  // Validate required parameters
  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required"
    ).toResponse();
  }

  // Validate UUID format
  if (!isValidUUID(id)) {
    return new ChatSDKError(
      "bad_request:document",
      "Invalid document id format"
    ).toResponse();
  }

  // Validate format parameter
  if (format !== "docx" && format !== "doc") {
    return new ChatSDKError(
      "bad_request:api",
      "Supported formats: 'docx' (recommended) or 'doc' (legacy)"
    ).toResponse();
  }

  // Authenticate user
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  // Fetch document
  let documents: Document[];
  try {
    documents = await getDocumentsById({ id });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    throw error;
  }

  // Get the latest version
  const document = documents.at(-1);
  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  // Verify ownership
  if (document.userId !== session.user.id) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const content = document.content || "";
  const title = document.title || "document";

  // ---- DOCX format (recommended) ----
  if (format === "docx") {
    try {
      const docxBuffer = await markdownToDocx(content, title);
      const filename = `${sanitizeFilename(title)}.docx`;

      // Convert Buffer to Uint8Array for Response compatibility
      const uint8Array = new Uint8Array(docxBuffer);

      return new Response(uint8Array, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error) {
      console.error("[DocumentExport] DOCX generation error:", error);
      return new ChatSDKError(
        "bad_request:document",
        "Failed to generate DOCX file"
      ).toResponse();
    }
  }

  // ---- Legacy .doc format (HTML wrapper) ----
  let htmlContent: string;

  if (isHtmlContent(content)) {
    // Content is already HTML
    htmlContent = content;
  } else {
    // Convert markdown to HTML
    htmlContent = markdownToHtml(content);
  }

  // Wrap in Word-compatible HTML
  const wordDocument = wrapHtmlForWord(htmlContent, title);

  // Generate filename
  const filename = `${sanitizeFilename(title)}.doc`;

  // Return as downloadable .doc file
  return new Response(wordDocument, {
    status: 200,
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
