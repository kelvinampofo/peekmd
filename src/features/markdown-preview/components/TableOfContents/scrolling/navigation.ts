export function keepItemVisible(scrollContainer: Element, item: Element): void {
  const viewport = scrollContainer.getBoundingClientRect();
  const bounds = item.getBoundingClientRect();
  const offset =
    bounds.top < viewport.top
      ? bounds.top - viewport.top
      : Math.max(bounds.bottom - viewport.bottom, 0);

  if (offset !== 0) scrollContainer.scrollBy({ top: offset, behavior: "instant" });
}

export function updateScrollIndicator(
  drawer: HTMLElement,
  track: Element,
  firstItem: Element,
  lastItem: Element,
): void {
  const trackTop = track.getBoundingClientRect().top;
  const start = firstItem.getBoundingClientRect().top;
  const end = lastItem.getBoundingClientRect().bottom;

  drawer.style.setProperty("--table-of-contents-visible-start", `${start - trackTop}px`);
  drawer.style.setProperty("--table-of-contents-visible-size", `${end - start}px`);
}
