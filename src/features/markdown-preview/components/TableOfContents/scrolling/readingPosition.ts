import type { Heading } from "../types/heading";

export interface SectionVisibility {
  id: Heading["id"];
  beforeReadingLine: boolean;
  inViewport: boolean;
}

export interface ReadingPosition {
  currentId: Heading["id"] | undefined;
  visibleIds: readonly Heading["id"][];
}

export function getReadingPosition(sections: readonly SectionVisibility[]): ReadingPosition {
  const currentIndex = sections.findLastIndex((section) => section.beforeReadingLine);
  const lastVisibleIndex = sections.findLastIndex((section) => section.inViewport);
  const firstIndex = Math.max(currentIndex, 0);
  const lastIndex = Math.max(currentIndex, lastVisibleIndex);

  return {
    currentId: sections[firstIndex]?.id,
    visibleIds: sections.slice(firstIndex, lastIndex + 1).map((section) => section.id),
  };
}

export function isSameReadingPosition(previous: ReadingPosition, next: ReadingPosition): boolean {
  return (
    previous.currentId === next.currentId &&
    previous.visibleIds.length === next.visibleIds.length &&
    previous.visibleIds.every((id, index) => id === next.visibleIds[index])
  );
}
