import { useEffect, useState, type RefObject } from "react";

import type { Heading } from "../types/heading";
import { isSameReadingPosition, type ReadingPosition } from "../scrolling/readingPosition";
import { keepItemVisible, updateScrollIndicator } from "../scrolling/navigation";
import { collectSections } from "../scrolling/sections";
import { observeSections } from "../scrolling/observeSections";

interface ScrollSpyOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  headings: readonly Heading[];
  drawerRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
}

const initialPosition: ReadingPosition = { currentId: undefined, visibleIds: [] };

export function useScrollSpy({
  contentRootRef,
  headings,
  drawerRef,
  scrollRootRef,
}: ScrollSpyOptions) {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    const content = contentRootRef.current;
    const drawer = drawerRef.current;
    const scrollContainer = scrollRootRef.current;

    if (!content || !drawer || !scrollContainer || headings.length === 0) {
      setPosition(initialPosition);
      return;
    }

    const sections = collectSections(content, drawer, headings);
    const navigationItems = new Map(sections.map(({ id, navigationItem }) => [id, navigationItem]));
    const navigationScroller = drawer.querySelector(".table-of-contents-drawer__content");
    const scrollTrack = drawer.querySelector(".table-of-contents__scroll-map");

    const itemFor = (id: Heading["id"] | undefined) =>
      id === undefined ? undefined : navigationItems.get(id);

    const syncNavigation = (next: ReadingPosition) => {
      const currentItem = itemFor(next.currentId);
      const firstItem = itemFor(next.visibleIds[0]);
      const lastItem = itemFor(next.visibleIds.at(-1));

      if (navigationScroller && currentItem) keepItemVisible(navigationScroller, currentItem);

      if (scrollTrack && firstItem && lastItem) {
        updateScrollIndicator(drawer, scrollTrack, firstItem, lastItem);
      }
    };

    const observation = observeSections({
      content,
      scrollContainer,
      sections,
      onChange(next) {
        syncNavigation(next);
        setPosition((previous) => (isSameReadingPosition(previous, next) ? previous : next));
      },
    });

    const followReadingPosition = () => syncNavigation(observation.getPosition());
    const controller = new AbortController();

    scrollContainer.addEventListener("scroll", followReadingPosition, {
      passive: true,
      signal: controller.signal,
    });

    return () => {
      controller.abort();
      observation.disconnect();
    };
  }, [contentRootRef, headings, drawerRef, scrollRootRef]);

  return { currentId: position.currentId, visibleIds: new Set(position.visibleIds) };
}
