import { collectMarkdownHeadings } from "@tanstack/markdown/extensions/headings";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { Markdown } from "@tanstack/markdown/react";
import { useMemo, useRef, type RefObject } from "react";
import TableOfContents, { type TableOfContentsItem } from "../TableOfContents/TableOfContents";

import "./MarkdownPreview.css";

interface MarkdownPreviewProps {
  source: string;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

function isHeadingLevel(level: number): level is TableOfContentsItem["level"] {
  return level >= 1 && level <= 6;
}

export default function MarkdownPreview({ source, scrollContainerRef }: MarkdownPreviewProps) {
  const articleRef = useRef<HTMLElement>(null);
  const document = useMemo(() => parseMarkdown(source), [source]);
  const headings = useMemo(
    () =>
      collectMarkdownHeadings(document).flatMap((heading) =>
        isHeadingLevel(heading.level)
          ? [{ id: heading.id, text: heading.text, level: heading.level }]
          : [],
      ),
    [document],
  );

  return (
    <div className="markdown-preview-layout">
      <TableOfContents
        items={headings}
        contentRootRef={articleRef}
        scrollRootRef={scrollContainerRef}
      />
      <article className="markdown-preview" ref={articleRef}>
        <Markdown>{document}</Markdown>
      </article>
    </div>
  );
}
