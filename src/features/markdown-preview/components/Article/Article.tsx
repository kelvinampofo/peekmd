import { Markdown } from "@tanstack/markdown/react";
import type { MarkdownDocument } from "@tanstack/markdown";

import "./Article.css";

interface ArticleProps {
  document: MarkdownDocument;
}

export default function Article({ document }: ArticleProps) {
  return (
    <article className="markdown-document">
      <Markdown>{document}</Markdown>
    </article>
  );
}
