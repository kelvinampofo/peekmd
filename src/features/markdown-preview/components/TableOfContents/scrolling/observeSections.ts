import {
  getReadingPosition,
  type ReadingPosition,
  type SectionVisibility,
} from "./readingPosition";
import type { SectionTarget } from "./sections";

interface ObservationOptions {
  content: HTMLElement;
  scrollContainer: HTMLElement;
  sections: readonly SectionTarget[];
  onChange: (position: ReadingPosition) => void;
}

export function observeSections({
  content,
  scrollContainer,
  sections,
  onChange,
}: ObservationOptions) {
  const visibility = new Map<Element, SectionVisibility>(
    sections.map(({ id, heading }) => [
      heading,
      { id, beforeReadingLine: false, inViewport: false },
    ]),
  );
  const observers = new Set<IntersectionObserver>();

  const getPosition = () => getReadingPosition(Array.from(visibility.values()));

  const refresh = () => {
    for (const observer of observers) observer.disconnect();
    observers.clear();

    for (const [element, section] of visibility) {
      visibility.set(element, { ...section, beforeReadingLine: false, inViewport: false });
    }

    const inset = Number.parseFloat(getComputedStyle(content).paddingTop) || 0;

    const readingLine = new IntersectionObserver(
      (entries) => {
        if (!observers.has(readingLine)) return;

        for (const entry of entries) {
          const section = visibility.get(entry.target);

          if (!section) continue;

          visibility.set(entry.target, {
            ...section,
            beforeReadingLine:
              entry.isIntersecting &&
              entry.boundingClientRect.top <= (entry.rootBounds?.bottom ?? -Infinity),
          });
        }

        onChange(getPosition());
      },
      {
        root: scrollContainer,
        // include the document above the reading line so jumps cannot skip a heading
        rootMargin: `${scrollContainer.scrollHeight}px 0px ${inset - scrollContainer.clientHeight}px 0px`,
        threshold: 0,
      },
    );

    const viewport = new IntersectionObserver(
      (entries) => {
        if (!observers.has(viewport)) return;

        for (const entry of entries) {
          const section = visibility.get(entry.target);

          if (!section) continue;

          visibility.set(entry.target, {
            ...section,
            inViewport: entry.intersectionRatio > 0,
          });
        }

        onChange(getPosition());
      },
      {
        root: scrollContainer,
        rootMargin: `${-inset}px 0px 0px 0px`,
        // trigger an update when a heading moves from touching the edge to being visible
        threshold: Number.EPSILON,
      },
    );

    observers.add(readingLine);
    observers.add(viewport);

    for (const { heading } of sections) {
      readingLine.observe(heading);
      viewport.observe(heading);
    }
  };

  const resizeObserver = new ResizeObserver(refresh);

  resizeObserver.observe(content);
  resizeObserver.observe(scrollContainer);
  refresh();

  return {
    getPosition,
    disconnect() {
      resizeObserver.disconnect();
      for (const observer of observers) observer.disconnect();
      observers.clear();
    },
  };
}
