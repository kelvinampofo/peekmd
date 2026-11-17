import { collectMarkdownHeadings } from "@tanstack/markdown/extensions/headings";
import type { MarkdownDocument } from "@tanstack/markdown";
import { Markdown } from "@tanstack/markdown/react";
import { useMemo, useRef, type RefObject } from "react";
import TableOfContents from "../TableOfContents/TableOfContents";
import type { Heading } from "../TableOfContents/types/heading";

import "./Article.css";

interface ArticleProps {
  document: MarkdownDocument;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

function isHeadingLevel(level: number): level is Heading["level"] {
  return Number.isInteger(level) && level >= 1 && level <= 6;
}

export default function Article({ document, scrollContainerRef }: ArticleProps) {
  const articleRef = useRef<HTMLElement>(null);
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
        headings={headings}
        contentRootRef={articleRef}
        scrollRootRef={scrollContainerRef}
      />
      <article className="markdown-document" ref={articleRef}>
        <Markdown>{document}</Markdown>
      </article>
    </div>
  );
}
