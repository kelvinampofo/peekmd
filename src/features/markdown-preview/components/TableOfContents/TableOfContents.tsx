import { useRef, type CSSProperties, type RefObject } from "react";

import "./TableOfContents.css";

import type { TableOfContentsItem } from "./TableOfContents.types";
import { useMobileTableOfContents } from "./useMobileTableOfContents";
import { useTableOfContentsTracking } from "./useTableOfContentsTracking";

export type { TableOfContentsItem } from "./TableOfContents.types";

interface TableOfContentsProps {
  items: readonly TableOfContentsItem[];
  contentRootRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
  onNavigate?: (id: string) => void;
}

type ItemStyle = CSSProperties & { "--table-of-contents-level": number };
type PanelStyle = CSSProperties & {
  "--table-of-contents-blur": string;
  "--table-of-contents-handle-offset": string;
  "--table-of-contents-handle-travel-correction": string;
  "--table-of-contents-open-progress": number;
  "--table-of-contents-reveal": string;
};

export default function TableOfContents({
  items,
  contentRootRef,
  scrollRootRef,
  onNavigate,
}: TableOfContentsProps) {
  const panelRef = useRef<HTMLElement>(null);
  const { activeIds, currentId } = useTableOfContentsTracking({
    contentRootRef,
    items,
    panelRef,
    scrollRootRef,
  });
  const currentIndex = Math.max(
    items.findIndex(({ id }) => id === currentId),
    0,
  );
  const mobile = useMobileTableOfContents({
    contentRootRef,
    currentIndex,
    items,
    ...(onNavigate ? { onNavigate } : {}),
  });

  if (items.length === 0) return null;

  const handleShapeProgress = mobile.isOpen ? 0 : mobile.openProgress;
  const handlePointX = 4 + handleShapeProgress * 10;
  const revealProgress = mobile.isOpen ? 1 : 0;
  const handleOffset = mobile.isOpen ? 32 : 4 + mobile.openProgress * 8;

  return (
    <aside
      className="table-of-contents-panel"
      data-mobile-dragging={mobile.openProgress > 0 && !mobile.isOpen ? true : undefined}
      data-mobile-open={mobile.isOpen || undefined}
      ref={panelRef}
      style={
        {
          "--table-of-contents-blur": `${mobile.openProgress * 18}px`,
          "--table-of-contents-handle-offset": `${handleOffset}px`,
          "--table-of-contents-handle-travel-correction": `${revealProgress * 44}px`,
          "--table-of-contents-open-progress": mobile.openProgress,
          "--table-of-contents-reveal": `${revealProgress * 100}%`,
        } as PanelStyle
      }
    >
      <button
        aria-controls="table-of-contents-navigation"
        aria-expanded={mobile.isOpen}
        aria-label={mobile.isOpen ? "Close table of contents" : "Open table of contents"}
        className="table-of-contents-handle"
        data-touch-gesture-control=""
        onClick={mobile.toggle}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 28 40">
          <path
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--secondary"
            d={`M 4 4 L ${handlePointX} 20 L 4 36`}
          />
        </svg>
      </button>
      <div className="table-of-contents-surface">
        <div className="table-of-contents-panel__content">
          <div className="table-of-contents__scroll-map" aria-hidden="true">
            <span className="table-of-contents__scroll-thumb" />
          </div>
          <nav
            className="table-of-contents"
            id="table-of-contents-navigation"
            aria-label="Table of contents"
          >
            <ol className="table-of-contents__list">
              {items.map((item) => (
                <li
                  className="table-of-contents__item"
                  data-heading-id={item.id}
                  data-level={item.level}
                  key={item.id}
                  style={{ "--table-of-contents-level": item.level } as ItemStyle}
                >
                  <a
                    className="table-of-contents__link"
                    href={`#${item.id}`}
                    aria-current={currentId === item.id ? "location" : undefined}
                    data-active={
                      activeIds.has(item.id) || mobile.scrubbedId === item.id || undefined
                    }
                    onClick={() => {
                      onNavigate?.(item.id);
                      mobile.close();
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </aside>
  );
}
