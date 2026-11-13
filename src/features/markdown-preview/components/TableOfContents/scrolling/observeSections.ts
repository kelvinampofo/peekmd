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

    const watchSections = (
      flag: Exclude<keyof SectionVisibility, "id">,
      read: (entry: IntersectionObserverEntry) => boolean,
      options: IntersectionObserverInit,
    ) => {
      const observer = new IntersectionObserver((entries) => {
        // ignore entries queued before a refresh replaced this observer
        if (!observers.has(observer)) return;

        for (const entry of entries) {
          const section = visibility.get(entry.target);

          if (section) visibility.set(entry.target, { ...section, [flag]: read(entry) });
        }

        onChange(getPosition());
      }, options);

      observers.add(observer);
      for (const { heading } of sections) observer.observe(heading);
    };

    watchSections(
      "beforeReadingLine",
      (entry) =>
        entry.isIntersecting &&
        entry.boundingClientRect.top <= (entry.rootBounds?.bottom ?? -Infinity),
      {
        root: scrollContainer,
        // include the document above the reading line so jumps cannot skip a heading
        rootMargin: `${scrollContainer.scrollHeight}px 0px ${inset - scrollContainer.clientHeight}px 0px`,
        threshold: 0,
      },
    );

    watchSections("inViewport", (entry) => entry.intersectionRatio > 0, {
      root: scrollContainer,
      rootMargin: `${-inset}px 0px 0px 0px`,
      // trigger an update when a heading moves from touching the edge to being visible
      threshold: Number.EPSILON,
    });
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
