import { useRef } from "react";

import TableOfContents from "../TableOfContents";
import type { Heading } from "../types/heading";

const headings: readonly Heading[] = [
  { id: "introduction", text: "Introduction", level: 1 },
  { id: "details", text: "Details", level: 2 },
];

interface FixtureProps {
  headings?: readonly Heading[];
  onNavigate?: ((id: Heading["id"]) => void) | undefined;
}

export function Fixture({ headings: fixtureHeadings = headings, onNavigate }: FixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section ref={scrollRootRef} aria-label="TOC scroller">
      <TableOfContents
        headings={fixtureHeadings}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        onNavigate={onNavigate}
      />
      <article ref={contentRootRef}>
        <h1 id="introduction">Introduction</h1>
        <p>Overview</p>
        <h2 id="details">Details</h2>
      </article>
    </section>
  );
}

const longDocumentHeadings: readonly Heading[] = Array.from({ length: 40 }, (_, index) => ({
  id: `section-${index}`,
  text: `Section ${index}`,
  level: 1,
}));

interface LongDocumentFixtureProps {
  sectionHeight?: number;
  onNavigate?: ((id: Heading["id"]) => void) | undefined;
}

export function LongDocumentFixture({ sectionHeight = 250, onNavigate }: LongDocumentFixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={scrollRootRef}
      aria-label="Long document"
      style={{
        height: 350,
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        alignItems: "start",
      }}
    >
      <TableOfContents
        headings={longDocumentHeadings}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        onNavigate={onNavigate}
      />
      <article ref={contentRootRef}>
        {longDocumentHeadings.map((item) => (
          <section key={item.id} style={{ height: sectionHeight }}>
            <h2 id={item.id}>{item.text}</h2>
          </section>
        ))}
      </article>
    </section>
  );
}
