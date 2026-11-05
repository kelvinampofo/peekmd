import { useEffect, useEffectEvent, useRef, type MouseEvent } from "react";

import type { Heading } from "../types/heading";

interface HeadingNavigationOptions {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (id: Heading["id"]) => void;
}

export function useHeadingNavigation({ isOpen, onClose, onNavigate }: HeadingNavigationOptions) {
  const pendingIdRef = useRef<Heading["id"] | undefined>(undefined);

  const finishNavigation = () => {
    const id = pendingIdRef.current;

    if (isOpen || id === undefined) return;

    pendingIdRef.current = undefined;
    onNavigate?.(id);
    window.location.assign(`#${id}`);
  };

  const onDesktopLayout = useEffectEvent(finishNavigation);

  useEffect(() => {
    if (isOpen) {
      pendingIdRef.current = undefined;
      return;
    }

    const media = window.matchMedia("(width > 900px)");
    const handleChange = () => {
      if (media.matches) onDesktopLayout();
    };

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [isOpen]);

  const handleHeadingClick = (event: MouseEvent<HTMLAnchorElement>, id: Heading["id"]) => {
    const isModifiedClick =
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      isModifiedClick ||
      prefersReducedMotion ||
      (!isOpen && pendingIdRef.current === undefined)
    ) {
      pendingIdRef.current = undefined;
      onNavigate?.(id);
      onClose();
      return;
    }

    event.preventDefault();
    pendingIdRef.current = id;
    onClose();
  };

  return { handleHeadingClick, finishNavigation };
}
