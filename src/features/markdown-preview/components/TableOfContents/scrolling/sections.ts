import type { Heading } from "../types/heading";

export interface SectionTarget {
  id: Heading["id"];
  heading: Element;
  navigationItem: Element;
}

export function collectSections(
  content: Element,
  drawer: Element,
  headings: readonly Heading[],
): readonly SectionTarget[] {
  const targets = new Map(
    Array.from(content.querySelectorAll("[id]"), (element) => [element.id, element]),
  );

  const navigationItems = new Map(
    Array.from(drawer.querySelectorAll("[data-heading-id]"), (element) => [
      element.getAttribute("data-heading-id"),
      element,
    ]),
  );

  return headings.flatMap(({ id }) => {
    if (!id) return [];

    const heading = targets.get(id);
    const navigationItem = navigationItems.get(id);

    return heading && navigationItem ? [{ id, heading, navigationItem }] : [];
  });
}
