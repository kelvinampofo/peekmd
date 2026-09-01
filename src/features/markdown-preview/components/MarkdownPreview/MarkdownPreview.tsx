import { Markdown } from "@tanstack/markdown/react";

import "./MarkdownPreview.css";

interface MarkdownPreviewProps {
  source: string;
}

export default function MarkdownPreview({ source }: MarkdownPreviewProps) {
  return (
    <article className="markdown-preview">
      <Markdown>{source}</Markdown>
    </article>
  );
}
