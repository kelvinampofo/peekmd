import { useEffect, useState, type RefObject } from "react";

import type { TableOfContentsItem } from "./TableOfContents.types";

interface UseTableOfContentsTrackingOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  items: readonly TableOfContentsItem[];
  panelRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
}

function setsMatch<T>(first: ReadonlySet<T>, second: ReadonlySet<T>) {
  return first.size === second.size && [...first].every((value) => second.has(value));
}

export function useTableOfContentsTracking({
  contentRootRef,
  items,
  panelRef,
  scrollRootRef,
}: UseTableOfContentsTrackingOptions) {
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(() => new Set());
  const [currentId, setCurrentId] = useState<string>();

  useEffect(() => {
    const contentRoot = contentRootRef.current;
    const panel = panelRef.current;
    const scrollRoot = scrollRootRef.current;

    if (!contentRoot || !panel || !scrollRoot || items.length === 0) {
      setActiveIds(new Set());
      setCurrentId(undefined);
      return;
    }

    const panelElement = panel;
    const observedScrollRoot = scrollRoot;

    const itemElements = new Map(
      Array.from(panelElement.querySelectorAll<HTMLElement>(".table-of-contents__item")).flatMap(
        (element) => {
          const id = element.dataset.headingId;
          return id ? [[id, element] as const] : [];
        },
      ),
    );
    const contentElements = new Map(
      Array.from(contentRoot.querySelectorAll<HTMLElement>("[id]")).map(
        (element) => [element.id, element] as const,
      ),
    );
    const entries = items.flatMap((item) => {
      const heading = contentElements.get(item.id);
      const itemElement = itemElements.get(item.id);
      return heading && itemElement ? [{ heading, id: item.id, itemElement }] : [];
    });
    const scrollMap = panelElement.querySelector<HTMLElement>(".table-of-contents__scroll-map");
    const viewportTopInset =
      Number.parseFloat(window.getComputedStyle(contentRoot).paddingTop) || 0;
    let animationFrameId: number | undefined;

    function updateActiveHeading() {
      animationFrameId = undefined;
      const scrollRootTop = observedScrollRoot.getBoundingClientRect().top;
      const scrollPosition = observedScrollRoot.scrollTop;
      const readingLine = scrollRootTop + viewportTopInset;
      const viewportStart = scrollPosition + viewportTopInset;
      const viewportEnd = scrollPosition + observedScrollRoot.clientHeight;
      const headingPositions = entries.map(
        ({ heading }) => heading.getBoundingClientRect().top - scrollRootTop + scrollPosition,
      );
      let firstVisibleIndex = -1;
      let lastVisibleIndex = -1;
      let nextCurrentId = entries[0]?.id;

      for (const [index, { heading, id }] of entries.entries()) {
        if (heading.getBoundingClientRect().top <= readingLine) nextCurrentId = id;

        const sectionStart = headingPositions[index] ?? 0;
        const sectionEnd = headingPositions[index + 1] ?? observedScrollRoot.scrollHeight;

        if (sectionEnd > viewportStart && sectionStart < viewportEnd) {
          if (firstVisibleIndex === -1) firstVisibleIndex = index;
          lastVisibleIndex = index;
        }
      }

      if (scrollMap && firstVisibleIndex !== -1 && lastVisibleIndex !== -1) {
        const firstVisibleItem = entries[firstVisibleIndex]?.itemElement;
        const lastVisibleItem = entries[lastVisibleIndex]?.itemElement;

        if (firstVisibleItem && lastVisibleItem) {
          const trackTop = scrollMap.getBoundingClientRect().top;
          const firstItemTop = firstVisibleItem.getBoundingClientRect().top;
          const lastItemBottom = lastVisibleItem.getBoundingClientRect().bottom;

          panelElement.style.setProperty(
            "--table-of-contents-visible-start",
            `${firstItemTop - trackTop}px`,
          );
          panelElement.style.setProperty(
            "--table-of-contents-visible-size",
            `${lastItemBottom - firstItemTop}px`,
          );
        }
      }

      const nextActiveIds = new Set(
        firstVisibleIndex === -1 || lastVisibleIndex === -1
          ? []
          : entries.slice(firstVisibleIndex, lastVisibleIndex + 1).map(({ id }) => id),
      );
      setActiveIds((activeIds) =>
        setsMatch(activeIds, nextActiveIds) ? activeIds : nextActiveIds,
      );
      setCurrentId((currentId) => (currentId === nextCurrentId ? currentId : nextCurrentId));
    }

    function scheduleUpdate() {
      if (animationFrameId !== undefined) return;
      animationFrameId = window.requestAnimationFrame(updateActiveHeading);
    }

    updateActiveHeading();
    observedScrollRoot.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      observedScrollRoot.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrameId !== undefined) window.cancelAnimationFrame(animationFrameId);
    };
  }, [contentRootRef, items, panelRef, scrollRootRef]);

  return { activeIds, currentId };
}
