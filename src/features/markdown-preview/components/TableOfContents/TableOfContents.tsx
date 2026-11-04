import { useRef, type CSSProperties, type RefObject } from "react";

import Drawer from "./components/Drawer";
import type { Heading } from "./types/heading";
import { useDrawer } from "./hooks/useDrawer";
import { useScrollSpy } from "./hooks/useScrollSpy";

import "./TableOfContents.css";

interface TableOfContentsProps {
  headings: readonly Heading[];
  contentRootRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
  onNavigate?: (id: string) => void;
}

interface HeadingItemStyle extends CSSProperties {
  "--table-of-contents-level": Heading["level"];
}

export default function TableOfContents({
  headings,
  contentRootRef,
  scrollRootRef,
  onNavigate,
}: TableOfContentsProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const { visibleIds, currentId } = useScrollSpy({
    contentRootRef,
    headings,
    drawerRef,
    scrollRootRef,
  });

  const currentIndex = Math.max(
    headings.findIndex(({ id }) => id === currentId),
    0,
  );

  const drawer = useDrawer({
    contentRootRef,
    currentIndex,
    headings,
    ...(onNavigate ? { onNavigate } : {}),
  });

  if (headings.length === 0) return null;

  return (
    <Drawer
      ref={drawerRef}
      isOpen={drawer.isOpen}
      isDragging={drawer.isDragging}
      openProgress={drawer.openProgress}
      handleProps={drawer.handleProps}
    >
      <div className="table-of-contents__scroll-map" aria-hidden="true">
        <span className="table-of-contents__scroll-thumb" />
      </div>
      <nav
        className="table-of-contents"
        id="table-of-contents-navigation"
        aria-label="Table of contents"
        data-gesture-control={drawer.isOpen ? "" : undefined}
        {...drawer.navigationProps}
      >
        <ol className="table-of-contents__list">
          {headings.map((heading) => {
            const style: HeadingItemStyle = {
              "--table-of-contents-level": heading.level,
            };

            return (
              <li
                className="table-of-contents__item"
                data-heading-id={heading.id}
                data-level={heading.level}
                key={heading.id}
                style={style}
              >
                <a
                  className="table-of-contents__link"
                  href={`#${heading.id}`}
                  aria-current={currentId === heading.id ? "location" : undefined}
                  data-active={
                    visibleIds.has(heading.id) || drawer.scrubbedId === heading.id || undefined
                  }
                  draggable={drawer.isOpen ? false : undefined}
                  onClick={() => {
                    onNavigate?.(heading.id);
                    drawer.close();
                  }}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </Drawer>
  );
}
