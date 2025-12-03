"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Copy,
  Info,
  Menu,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Table of contents item structure
 */
type TocItem = {
  /** Unique key for React list rendering (handles duplicate headings) */
  tocKey: string;
  /** DOM anchor ID derived from heading text (may repeat for duplicate headings) */
  id: string;
  level: number;
  text: string;
};

/**
 * Props for the MarkdownViewer component
 */
export type MarkdownViewerProps = {
  /** Markdown content to render */
  content: string;
  /** Document title displayed in header */
  title?: string;
  /** Optional description for the header */
  description?: string;
  /** Additional className for the container */
  className?: string;
};

/**
 * Props for the MarkdownViewerArtifact (widget wrapper)
 */
export type MarkdownViewerArtifactProps = {
  className?: string;
  content?: string;
  title?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const WORDS_PER_MINUTE = 200;
const SCROLL_THRESHOLD = 300;
const HEADING_OFFSET = 100;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a slug from heading text for IDs
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Parse markdown content to extract table of contents
 */
function parseToc(content: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const items: TocItem[] = [];
  const slugCounts = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateSlug(text);

    // Generate unique tocKey by tracking slug occurrences
    const count = slugCounts.get(id) ?? 0;
    slugCounts.set(id, count + 1);
    const tocKey = count === 0 ? id : `${id}-${count}`;

    items.push({ tocKey, id, level, text });
  }

  return items;
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

/**
 * Detect blockquote type based on content
 */
function getBlockquoteType(
  content: string
): "note" | "warning" | "info" | "default" {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes("note:") || lowerContent.includes("tip:")) {
    return "note";
  }
  if (lowerContent.includes("warning:") || lowerContent.includes("caution:")) {
    return "warning";
  }
  if (lowerContent.includes("info:")) {
    return "info";
  }
  return "default";
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Progress bar component - Fixed at the top
 */
const ProgressBar = memo(function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  return (
    <div className="fixed top-0 right-0 left-0 z-50 h-[1px] bg-orange-100">
      <div
        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
});

/**
 * Table of Contents - Right-side slide-out panel
 */
const TableOfContents = memo(function TableOfContents({
  items,
  activeSection,
  isOpen,
  onClose,
  readingTime,
  onNavigate,
}: {
  items: TocItem[];
  activeSection: string;
  isOpen: boolean;
  onClose: () => void;
  readingTime: number;
  onNavigate: (id: string) => void;
}) {
  // Handle navigation and close panel
  const handleNavigate = useCallback(
    (id: string) => {
      onNavigate(id);
      onClose();
    },
    [onNavigate, onClose]
  );

  return (
    <>
      {/* Backdrop overlay */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      {/* Slide-out panel from right */}
      <nav
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4">
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="size-5" />
            <span className="font-semibold text-lg">Contenuti</span>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Reading time indicator */}
        <div className="flex items-center gap-2 border-orange-100 border-b px-5 py-3 text-neutral-600 text-sm">
          <Clock className="size-4 text-orange-500" />
          <span>{readingTime} min read</span>
        </div>

        {/* Navigation list */}
        <div className="h-[calc(100%-8rem)] overflow-y-auto py-3">
          <div className="flex flex-col gap-1 px-3">
            {items.map((item) => {
              const indent = (item.level - 1) * 0.75 + 0.75;
              const isActive = activeSection === item.id;
              const dotColor =
                item.level === 1
                  ? "bg-orange-500"
                  : item.level === 2
                    ? "bg-amber-500"
                    : "bg-neutral-400";

              return (
                <button
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-orange-100 font-medium text-orange-700"
                      : "text-neutral-600 hover:bg-orange-50"
                  )}
                  key={item.tocKey}
                  onClick={() => handleNavigate(item.id)}
                  style={{ paddingLeft: `${indent}rem` }}
                  type="button"
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", dotColor)}
                  />
                  <span className="truncate">{item.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
});

/**
 * Code block with syntax highlighting and copy button
 */
const CodeBlock = memo(function CodeBlock({
  language,
  children,
}: {
  language?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const displayLanguage = language || "text";

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200 shadow-md">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-neutral-800 px-4 py-2">
        <span className="text-neutral-400 text-sm uppercase tracking-wide">
          {displayLanguage}
        </span>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-white"
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <CheckCheck className="size-4" />
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span className="text-sm">Copy</span>
              </>
            )}
          </button>
          {/* Traffic light dots */}
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-yellow-400" />
            <span className="size-3 rounded-full bg-green-400" />
          </div>
        </div>
      </div>
      {/* Code content */}
      <SyntaxHighlighter
        customStyle={{
          margin: 0,
          padding: "1.5rem",
          borderRadius: 0,
          fontSize: "0.875rem",
        }}
        language={displayLanguage}
        style={oneDark}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
});

/**
 * Scroll to top button
 */
const ScrollToTopButton = memo(function ScrollToTopButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <button
      className="fixed right-8 bottom-8 z-40 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
      onClick={onClick}
      type="button"
    >
      <ArrowUp className="size-5" />
    </button>
  );
});

// ============================================================================
// MARKDOWN RENDERERS
// ============================================================================

/**
 * Render heading elements (H1-H6)
 */
function renderHeading(
  level: number,
  text: string,
  id: string
): React.ReactNode {
  const baseClasses = "scroll-mt-24";

  switch (level) {
    case 1:
      return (
        <h1
          className={cn(
            baseClasses,
            "mb-6 border-orange-100 border-b-2 pb-4 font-bold text-3xl text-neutral-900"
          )}
          data-heading-id={id}
          id={id}
        >
          {text}
        </h1>
      );
    case 2:
      return (
        <h2
          className={cn(
            baseClasses,
            "mt-12 mb-5 flex items-center gap-3 border-orange-200 border-b pb-3 font-semibold text-2xl text-neutral-800"
          )}
          data-heading-id={id}
          id={id}
        >
          <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
          {text}
        </h2>
      );
    case 3:
      return (
        <h3
          className={cn(
            baseClasses,
            "mt-8 mb-4 flex items-center gap-2 font-semibold text-neutral-800 text-xl"
          )}
          data-heading-id={id}
          id={id}
        >
          <ChevronRight className="size-5 text-orange-500" />
          {text}
        </h3>
      );
    case 4:
      return (
        <h4
          className={cn(
            baseClasses,
            "mt-6 mb-3 font-semibold text-lg text-neutral-700"
          )}
          data-heading-id={id}
          id={id}
        >
          {text}
        </h4>
      );
    case 5:
      return (
        <h5
          className={cn(
            baseClasses,
            "mt-4 mb-2 font-medium text-base text-neutral-700"
          )}
          data-heading-id={id}
          id={id}
        >
          {text}
        </h5>
      );
    default:
      return (
        <h6
          className={cn(
            baseClasses,
            "mt-4 mb-2 font-medium text-neutral-600 text-sm"
          )}
          data-heading-id={id}
          id={id}
        >
          {text}
        </h6>
      );
  }
}

/**
 * Render a blockquote with content-aware styling
 */
function renderBlockquote(content: string): React.ReactNode {
  const type = getBlockquoteType(content);

  const config = {
    note: {
      border: "border-blue-500",
      bg: "bg-blue-50",
      icon: <Info className="size-5 shrink-0 text-blue-500" />,
    },
    warning: {
      border: "border-amber-500",
      bg: "bg-amber-50",
      icon: <AlertTriangle className="size-5 shrink-0 text-amber-600" />,
    },
    info: {
      border: "border-indigo-500",
      bg: "bg-indigo-50",
      icon: <AlertCircle className="size-5 shrink-0 text-indigo-500" />,
    },
    default: {
      border: "border-orange-500",
      bg: "bg-orange-50",
      icon: null,
    },
  };

  const { border, bg, icon } = config[type];

  return (
    <blockquote
      className={cn(
        "mb-5 flex gap-3 rounded-r-lg border-l-4 py-4 pr-4 pl-4",
        border,
        bg
      )}
    >
      {icon && <div className="mt-1">{icon}</div>}
      <div className="flex-1 text-neutral-700 leading-relaxed">{content}</div>
    </blockquote>
  );
}

/**
 * Render horizontal rule
 */
function renderHorizontalRule(): React.ReactNode {
  return (
    <div className="my-10 flex items-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
      <span className="size-2 rounded-full bg-orange-400" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
    </div>
  );
}

/**
 * Render a link
 */
function renderLink(href: string, text: string): React.ReactNode {
  return (
    <a
      className="inline-flex items-center gap-1 text-orange-600 underline decoration-orange-300 transition-colors hover:text-orange-700 hover:decoration-orange-500"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {text}
      <ChevronRight className="size-3" />
    </a>
  );
}

// ============================================================================
// MARKDOWN PARSER
// ============================================================================

/**
 * Parse and render markdown content to React elements
 */
function parseMarkdown(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks (fenced)
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <CodeBlock key={key++} language={language}>
          {codeLines.join("\n")}
        </CodeBlock>
      );
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const id = generateSlug(text);
      elements.push(<div key={key++}>{renderHeading(level, text, id)}</div>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(<div key={key++}>{renderHorizontalRule()}</div>);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].slice(1).trim());
        i++;
      }
      elements.push(
        <div key={key++}>{renderBlockquote(quoteLines.join(" "))}</div>
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*+]\s/, ""));
        i++;
      }
      elements.push(
        <ul className="mb-5 flex list-none flex-col gap-2" key={key++}>
          {listItems.map((item, idx) => (
            <li className="flex items-start gap-3" key={idx}>
              <span className="mt-2 size-2 shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
              <span className="text-neutral-700 leading-relaxed">
                {parseInlineMarkdown(item)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol
          className="counter-reset-item mb-5 flex list-none flex-col gap-2"
          key={key++}
        >
          {listItems.map((item, idx) => (
            <li
              className="counter-increment-item flex items-start gap-3"
              key={idx}
            >
              <span className="counter-display flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-sm text-white" />
              <span className="text-neutral-700 leading-relaxed">
                {parseInlineMarkdown(item)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Task list
    if (/^[-*+]\s+\[[ xX]\]/.test(line)) {
      const taskItems: { text: string; checked: boolean }[] = [];
      while (i < lines.length && /^[-*+]\s+\[[ xX]\]/.test(lines[i])) {
        const match = lines[i].match(/^[-*+]\s+\[([ xX])\]\s*(.*)$/);
        if (match) {
          taskItems.push({
            checked: match[1].toLowerCase() === "x",
            text: match[2],
          });
        }
        i++;
      }
      elements.push(
        <ul className="mb-5 flex list-none flex-col gap-2" key={key++}>
          {taskItems.map((item, idx) => (
            <li className="flex items-start gap-3" key={idx}>
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  item.checked
                    ? "border-orange-500 bg-orange-500"
                    : "border-neutral-300 hover:border-orange-400"
                )}
              >
                {item.checked && <Check className="size-3 text-white" />}
              </span>
              <span
                className={cn(
                  "leading-relaxed",
                  item.checked
                    ? "text-neutral-500 line-through"
                    : "text-neutral-700"
                )}
              >
                {parseInlineMarkdown(item.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Table
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("|")
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (row: string) =>
          row
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean);

        const headers = parseRow(tableLines[0]);
        // Skip separator line (index 1)
        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div
            className="mb-6 overflow-auto rounded-lg border-2 border-orange-200 shadow-sm"
            key={key++}
          >
            <table className="w-full">
              <thead className="border-orange-200 border-b-2 bg-gradient-to-r from-orange-50 to-amber-50">
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      className="px-4 py-3 text-left font-semibold text-neutral-700"
                      key={idx}
                    >
                      {parseInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100">
                {rows.map((row, rowIdx) => (
                  <tr
                    className="transition-colors hover:bg-orange-50"
                    key={rowIdx}
                  >
                    {row.map((cell, cellIdx) => (
                      <td className="px-4 py-3 text-neutral-600" key={cellIdx}>
                        {parseInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Paragraph (non-empty line)
    if (line.trim()) {
      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].startsWith("#") &&
        !lines[i].startsWith(">") &&
        !lines[i].startsWith("```") &&
        !/^[-*+]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim()) &&
        !lines[i].includes("|")
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }
      elements.push(
        <p className="mb-5 text-neutral-700 leading-relaxed" key={key++}>
          {parseInlineMarkdown(paragraphLines.join(" "))}
        </p>
      );
      continue;
    }

    // Empty line - skip
    i++;
  }

  return elements;
}

/**
 * Parse inline markdown elements (bold, italic, code, links)
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold (**text** or __text__)
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      elements.push(
        <strong className="font-semibold text-neutral-900" key={key++}>
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic (*text* or _text_)
    const italicMatch = remaining.match(/^(\*|_)(.+?)\1/);
    if (italicMatch) {
      elements.push(
        <em className="text-neutral-700 italic" key={key++}>
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code (`code`)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(
        <code
          className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-orange-600 text-sm"
          key={key++}
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      elements.push(
        <span key={key++}>{renderLink(linkMatch[2], linkMatch[1])}</span>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular text - find next special character or end
    const nextSpecial = remaining.search(/(\*\*|__|`|\*|_|\[)/);
    if (nextSpecial === -1) {
      elements.push(remaining);
      break;
    }
    if (nextSpecial === 0) {
      // No match found, just take the first character
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      elements.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements.length === 1 ? elements[0] : elements;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * MarkdownViewer
 * A feature-rich markdown viewer with TOC, progress bar, and styled elements.
 * Can be used standalone or embedded in other components.
 */
export const MarkdownViewer = memo(function MarkdownViewer({
  content,
  title = "Markdown Document",
  description,
  className,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // State
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Calculate reading time
  const readingTime = useMemo(() => calculateReadingTime(content), [content]);

  // Parse TOC on content change
  useEffect(() => {
    setToc(parseToc(content));
  }, [content]);

  // Scroll tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const totalScrollable = scrollHeight - clientHeight;

      // Update progress
      const progress =
        totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Show/hide scroll to top button
      setShowScrollTop(scrollTop > SCROLL_THRESHOLD);

      // Update active section
      const contentEl = contentRef.current;
      if (contentEl) {
        const headings = contentEl.querySelectorAll("[data-heading-id]");
        let currentActive = "";

        for (const heading of headings) {
          const rect = heading.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;

          if (relativeTop <= HEADING_OFFSET) {
            currentActive = heading.getAttribute("data-heading-id") || "";
          }
        }

        if (currentActive !== activeSection) {
          setActiveSection(currentActive);
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  // Navigate to section
  const handleNavigate = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset =
        elementRect.top -
        containerRect.top +
        containerRef.current.scrollTop -
        96;

      containerRef.current.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    }
  }, []);

  // Scroll to top
  const handleScrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // Toggle TOC
  const handleToggleToc = useCallback(() => {
    setShowToc((prev) => !prev);
  }, []);

  // Parse content
  const renderedContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={cn(
        "markdown-viewer-scrollbar relative h-full overflow-y-auto bg-gradient-to-br from-orange-50 to-amber-50",
        className
      )}
      ref={containerRef}
    >
      {/* Progress bar */}
      <ProgressBar progress={scrollProgress} />

      {/* Main layout */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Main content card */}
        <article className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header with menu button */}
          <header className="relative bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-2xl text-white">{title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {description && (
                    <span className="truncate text-orange-100">
                      {description}
                    </span>
                  )}
                  <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-orange-100 text-sm">
                    <Clock className="size-4" />
                    {readingTime} min read
                  </span>
                </div>
              </div>
              {/* Menu button */}
              <button
                className="ml-4 flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                onClick={handleToggleToc}
                title="Apri indice"
                type="button"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="prose-container px-8 py-10" ref={contentRef}>
            {renderedContent}
          </div>
        </article>
      </div>

      {/* TOC Panel (slides in from right) */}
      <TableOfContents
        activeSection={activeSection}
        isOpen={showToc}
        items={toc}
        onClose={handleToggleToc}
        onNavigate={handleNavigate}
        readingTime={readingTime}
      />

      {/* Scroll to top button */}
      <ScrollToTopButton onClick={handleScrollToTop} visible={showScrollTop} />
    </div>
  );
});

// ============================================================================
// ARTIFACT WRAPPER
// ============================================================================

/**
 * MarkdownViewerArtifact
 * Widget wrapper for use in the canvas tab system.
 */
export function MarkdownViewerArtifact({
  className,
  content = "",
  title = "Markdown Document",
}: MarkdownViewerArtifactProps) {
  return (
    <MarkdownViewer
      className={cn("h-full w-full", className)}
      content={content}
      title={title}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export const MARKDOWN_VIEWER_KIND = "markdown-viewer" as const;
export type MarkdownViewerKind = typeof MARKDOWN_VIEWER_KIND;
