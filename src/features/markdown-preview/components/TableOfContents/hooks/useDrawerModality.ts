import { useLayoutEffect, useRef, type RefObject } from "react";

interface DrawerModalityOptions {
  drawerRef: RefObject<HTMLDivElement | null>;
  handleRef: RefObject<HTMLButtonElement | null>;
  isActive: boolean;
  hasHeadings: boolean;
}

function collectOutsideElements(element: HTMLElement): HTMLElement[] {
  const parent = element.parentElement;

  if (!parent || element === document.body) {
    return [];
  }

  const siblings = Array.from(parent.children).flatMap((sibling) =>
    sibling instanceof HTMLElement && sibling !== element && !sibling.inert ? [sibling] : [],
  );

  return [...siblings, ...collectOutsideElements(parent)];
}

export function useDrawerModality({
  drawerRef,
  handleRef,
  isActive,
  hasHeadings,
}: DrawerModalityOptions) {
  const releaseRef = useRef<(() => void) | null>(null);

  const attachDrawer = (element: HTMLDivElement | null) => {
    drawerRef.current = element;

    return () => {
      releaseRef.current?.();
      drawerRef.current = null;
    };
  };

  const release = () => {
    releaseRef.current?.();
  };

  useLayoutEffect(() => {
    const drawer = drawerRef.current;
    const handle = handleRef.current;

    if (!drawer || !handle) return;

    const compactLayout = window.matchMedia("(max-width: 900px)");

    if (!compactLayout.matches) {
      releaseRef.current?.();
      return;
    }

    if (!isActive) {
      const surface = drawer.querySelector(".table-of-contents-surface");

      if (surface && surface.getBoundingClientRect().right <= 0.5) {
        releaseRef.current?.();
      }

      return;
    }

    if (releaseRef.current) return;

    const outsideElements = collectOutsideElements(drawer);

    for (const element of outsideElements) {
      element.setAttribute("inert", "");
    }

    drawer.setAttribute("popover", "manual");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "Table of contents");
    drawer.setAttribute("aria-modal", "true");
    drawer.showPopover();

    handle.focus({ preventScroll: true });

    releaseRef.current = () => {
      const focusedControl = document.activeElement;

      drawer.hidePopover();
      drawer.removeAttribute("popover");
      drawer.removeAttribute("role");
      drawer.removeAttribute("aria-label");
      drawer.removeAttribute("aria-modal");

      for (const element of outsideElements) element.removeAttribute("inert");

      if (handle.isConnected && compactLayout.matches) {
        handle.focus({ preventScroll: true });
      } else if (focusedControl instanceof HTMLElement && drawer.contains(focusedControl)) {
        focusedControl.focus({ preventScroll: true });
      }

      releaseRef.current = null;
    };
  }, [drawerRef, handleRef, isActive, hasHeadings]);

  return { attachDrawer, release };
}
