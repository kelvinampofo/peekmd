import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";

import { claimTouchGesture } from "../../interactions/touchGesture";
import type { TableOfContentsItem } from "./TableOfContents.types";

const OPEN_DISTANCE = 88;
const SCRUB_STEP = 32;

interface MobileGesture {
  baseIndex: number;
  didDrag: boolean;
  hasScrubbed: boolean;
  mode: "ignored" | "opening" | "pending" | "scrubbing";
  scrubOriginY: number;
  selectedIndex: number;
  startX: number;
  startY: number;
  startedOnHeading: boolean;
}

interface UseMobileTableOfContentsOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  currentIndex: number;
  items: readonly TableOfContentsItem[];
  onNavigate?: (id: string) => void;
}

export function useMobileTableOfContents({
  contentRootRef,
  currentIndex,
  items,
  onNavigate,
}: UseMobileTableOfContentsOptions) {
  const gestureRef = useRef<MobileGesture | undefined>(undefined);
  const suppressNextClickRef = useRef(false);
  const suppressionTimeoutRef = useRef<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [openProgress, setOpenProgress] = useState(0);
  const [scrubbedId, setScrubbedId] = useState<string>();

  const getState = useEffectEvent(() => ({ currentIndex, isOpen, items }));
  const reportNavigation = useEffectEvent((id: string) => onNavigate?.(id));

  const close = useCallback(() => {
    setIsOpen(false);
    setOpenProgress(0);
    setScrubbedId(undefined);
  }, []);

  const scrollToItem = useEffectEvent((index: number) => {
    const item = items[index];
    const contentRoot = contentRootRef.current;

    if (!item || !contentRoot) return;

    const heading = Array.from(contentRoot.querySelectorAll<HTMLElement>("[id]")).find(
      (element) => element.id === item.id,
    );

    heading?.scrollIntoView({ behavior: "auto", block: "start" });
    setScrubbedId(item.id);
  });

  const toggle = () => {
    if (isOpen) {
      close();
      return;
    }

    setIsOpen(true);
    setOpenProgress(1);
    setScrubbedId(items[currentIndex]?.id);
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");

    const isHeadingTarget = (target: EventTarget | null) =>
      target instanceof Element && target.closest(".table-of-contents__link") !== null;

    const handleTouchStart = (event: TouchEvent) => {
      const state = getState();
      const touch = event.touches[0];

      if (!media.matches || event.touches.length !== 1 || !touch) return;

      suppressNextClickRef.current = false;
      gestureRef.current = {
        baseIndex: state.currentIndex,
        didDrag: false,
        hasScrubbed: false,
        mode: state.isOpen ? "scrubbing" : "pending",
        scrubOriginY: touch.clientY,
        selectedIndex: state.currentIndex,
        startX: touch.clientX,
        startY: touch.clientY,
        startedOnHeading: isHeadingTarget(event.target),
      };

      if (state.isOpen) setScrubbedId(state.items[state.currentIndex]?.id);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      const touch = event.touches[0];

      if (!gesture) return;

      if (event.touches.length !== 1 || !touch) {
        gestureRef.current = undefined;
        close();
        return;
      }

      if (gesture.mode === "pending") {
        const horizontalDistance = touch.clientX - gesture.startX;
        const verticalDistance = touch.clientY - gesture.startY;

        if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) <= 4) return;

        const preservesNativeScroll =
          Math.abs(verticalDistance) >= Math.abs(horizontalDistance) || horizontalDistance <= 0;

        gesture.mode = preservesNativeScroll ? "ignored" : "opening";

        if (gesture.mode === "opening") {
          gesture.didDrag = true;
          claimTouchGesture();
        }
      }

      if (gesture.mode === "ignored") return;

      if (gesture.mode === "opening") {
        const distance = Math.max(touch.clientX - gesture.startX, 0);
        const progress = Math.min(distance / OPEN_DISTANCE, 1);

        event.preventDefault();
        setOpenProgress(progress);

        if (progress === 1) {
          const state = getState();
          gesture.mode = "scrubbing";
          gesture.scrubOriginY = touch.clientY;
          gesture.baseIndex = state.currentIndex;
          gesture.selectedIndex = state.currentIndex;
          setIsOpen(true);
          setScrubbedId(state.items[state.currentIndex]?.id);
        }

        return;
      }

      event.preventDefault();
      const state = getState();
      const indexDelta = Math.trunc((touch.clientY - gesture.scrubOriginY) / SCRUB_STEP);
      const nextIndex = Math.min(
        Math.max(gesture.baseIndex + indexDelta, 0),
        state.items.length - 1,
      );

      if (nextIndex === gesture.selectedIndex) return;

      gesture.didDrag = true;
      gesture.hasScrubbed = true;
      gesture.selectedIndex = nextIndex;
      scrollToItem(nextIndex);
    };

    const finishGesture = (cancelled = false) => {
      const gesture = gestureRef.current;

      if (!gesture) return;
      gestureRef.current = undefined;

      const tappedOutsideHeadingList =
        !cancelled && gesture.mode === "scrubbing" && !gesture.didDrag && !gesture.startedOnHeading;

      if (gesture.didDrag || tappedOutsideHeadingList) {
        suppressNextClickRef.current = true;
        window.clearTimeout(suppressionTimeoutRef.current);
        suppressionTimeoutRef.current = window.setTimeout(() => {
          suppressNextClickRef.current = false;
        });
      }

      if (cancelled) {
        if (gesture.mode === "opening" || gesture.mode === "pending") close();
        return;
      }

      if (tappedOutsideHeadingList) {
        close();
        return;
      }

      if (gesture.mode === "ignored" || gesture.mode === "pending") return;

      if (gesture.mode === "opening") {
        setOpenProgress(0);
        return;
      }

      if (gesture.hasScrubbed) {
        const item = getState().items[gesture.selectedIndex];
        if (item) reportNavigation(item.id);
        close();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (getState().isOpen && !isHeadingTarget(event.target)) close();
    };

    const handleTouchCancel = () => finishGesture(true);
    const handleTouchEnd = () => finishGesture();

    window.addEventListener("click", handleClick, true);
    window.addEventListener("touchcancel", handleTouchCancel);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      window.clearTimeout(suppressionTimeoutRef.current);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [close, contentRootRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen]);

  return { close, isOpen, openProgress, scrubbedId, toggle };
}
