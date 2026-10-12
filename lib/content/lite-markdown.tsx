// A tiny, intentionally limited markdown-like renderer for admin-editable
// text blocks (see lib/actions/settings.ts / system_settings table).
// Admin-entered content is never rendered as HTML -- only this fixed set
// of block/inline patterns is recognized, everything else stays plain
// text. This keeps an admin's edits safe (no markup injection) while
// still letting them reproduce headings, lists, bold, and small print.
//
// Supported syntax (blocks are separated by one or more blank lines):
//   # Heading        -> bold title line (used once, at the top)
//   ## Sub heading   -> bold sub-heading line
//   - item           -> bullet list (every line in the block starts with "- ")
//   1. item          -> numbered list (every line in the block starts with "N. ")
//   > small print    -> muted small-print paragraph (every line starts with "> ")
//   anything else    -> a plain paragraph; single newlines inside it become <br/>
//   **bold**         -> inline bold, works inside any of the above
//
// There is no escaping needed for the author: this format can't produce
// any HTML tag, link, or script -- only the elements listed above.

import { Fragment, type ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    if (part === "\n") return <br key={i} />;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "p"; text: string };

function parseBlocks(source: string): Block[] {
  const rawBlocks = source
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return rawBlocks.map((block): Block => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 1 && lines[0].startsWith("## ")) {
      return { type: "h2", text: lines[0].slice(3).trim() };
    }
    if (lines.length === 1 && lines[0].startsWith("# ")) {
      return { type: "h1", text: lines[0].slice(2).trim() };
    }
    if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
      return { type: "ul", items: lines.map((l) => l.slice(2).trim()) };
    }
    if (lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l))) {
      return { type: "ol", items: lines.map((l) => l.replace(/^\d+\.\s+/, "")) };
    }
    if (lines.length > 0 && lines.every((l) => l.startsWith("> "))) {
      return { type: "quote", text: lines.map((l) => l.slice(2).trim()).join("\n") };
    }
    return { type: "p", text: lines.join("\n") };
  });
}

export function renderLiteMarkdown(source: string | null | undefined): ReactNode {
  if (!source || !source.trim()) return null;

  return parseBlocks(source).map((block, i) => {
    switch (block.type) {
      case "h1":
        return (
          <h2 key={i} className="font-bold text-(--color-brand-dark) text-base">
            {renderInline(block.text)}
          </h2>
        );
      case "h2":
        return (
          <div key={i} className="font-semibold">
            {renderInline(block.text)}
          </div>
        );
      case "ul":
        return (
          <ul key={i} className="list-disc ps-5 space-y-1">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} className="list-decimal ps-5 space-y-1">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      case "quote":
        return (
          <p key={i} className="text-xs text-black/60">
            {renderInline(block.text)}
          </p>
        );
      case "p":
        return <p key={i}>{renderInline(block.text)}</p>;
    }
  });
}
