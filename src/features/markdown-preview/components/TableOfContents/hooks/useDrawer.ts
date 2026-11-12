import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import type { Heading } from "../types/heading";
import {
  moveGesture,
  ownsPointer,
  releaseGesture,
  type GestureSource,
  type GestureState,
} from "../gestures/drawer";
import { useDismissal } from "./useDismissal";

const COMPACT_LAYOUT_QUERY = "(max-width: 900px)";

type DrawerState =
  | { phase: "closed" }
  | { phase: "opening"; progress: number }
  | { phase: "closing"; progress: number }
  | { phase: "open"; selectedId: Heading["id"] | undefined }
  // the drawer is closed and the heading is followed once its close animation ends
  | { phase: "navigating"; targetId: Heading["id"] };

interface DrawerOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
  currentIndex: number;
  headings: readonly Heading[];
  onNavigate?: ((id: Heading["id"]) => void) | undefined;
}

export function useDrawer({
  contentRootRef,
  scrollRootRef,
  currentIndex,
  headings,
  onNavigate,
}: DrawerOptions) {
  const handleRef = useRef<HTMLButtonElement>(null);
  const gestureRef = useRef<GestureState>({ phase: "idle" });
  const suppressNextClickRef = useRef(false);

  const [drawer, setDrawer] = useState<DrawerState>({ phase: "closed" });

  const isOpen = drawer.phase === "open" || drawer.phase === "closing";
  const isDragging = drawer.phase === "opening" || drawer.phase === "closing";
  const openProgress = isDragging ? drawer.progress : isOpen ? 1 : 0;
  const scrubbedId = drawer.phase === "open" ? drawer.selectedId : undefined;
  const hasHeadings = headings.length > 0;

  const resetGesture = () => {
    gestureRef.current = { phase: "idle" };
    suppressNextClickRef.current = false;
  };

  const close = () => {
    resetGesture();
    setDrawer({ phase: "closed" });
  };

  const open = () => setDrawer({ phase: "open", selectedId: headings[currentIndex]?.id });

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const scrollToHeading = (index: number) => {
    const heading = headings[index];
    const contentRoot = contentRootRef.current;

    if (!heading || !contentRoot) return;

    const target = contentRoot.querySelector(`#${CSS.escape(heading.id)}`);

    target?.scrollIntoView({ behavior: "instant", block: "start" });
    setDrawer({ phase: "open", selectedId: heading.id });
  };

  const restoreReadingPosition = (originIndex: number, originScrollTop: number) => {
    scrollRootRef.current?.scrollTo({ top: originScrollTop, behavior: "instant" });
    setDrawer({ phase: "open", selectedId: headings[originIndex]?.id });
  };

  const handleHeadingClick = (event: MouseEvent<HTMLAnchorElement>, id: Heading["id"]) => {
    const isModifiedClick =
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isClosing = isOpen || drawer.phase === "navigating";

    if (isModifiedClick || prefersReducedMotion || !isClosing) {
      onNavigate?.(id);
      close();
      return;
    }

    event.preventDefault();
    resetGesture();
    setDrawer({ phase: "navigating", targetId: id });
  };

  const finishNavigation = () => {
    if (drawer.phase !== "navigating") return;

    const { targetId } = drawer;

    setDrawer({ phase: "closed" });
    onNavigate?.(targetId);
    window.location.assign(`#${targetId}`);
  };

  const startGesture = (event: PointerEvent<HTMLElement>, source: GestureSource) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      !hasHeadings ||
      !window.matchMedia(COMPACT_LAYOUT_QUERY).matches
    ) {
      return;
    }

    suppressNextClickRef.current = false;
    gestureRef.current = {
      phase: "pressed",
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      startedOpen: isOpen,
      source,
    };

    if (source === "handle") event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const previous = gestureRef.current;

    if (!ownsPointer(previous, event.pointerId)) return;

    const gesture = moveGesture(
      previous,
      { x: event.clientX, y: event.clientY },
      {
        currentIndex,
        headingCount: headings.length,
        travelDistance: Math.max(window.innerWidth, 1),
        scrollTop: scrollRootRef.current?.scrollTop ?? 0,
      },
    );

    gestureRef.current = gesture;

    if (
      gesture.phase === "scrubbing" ||
      gesture.phase === "revealing" ||
      gesture.phase === "closing"
    ) {
      event.preventDefault();
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (gesture.phase === "revealing" || gesture.phase === "closing") {
      setDrawer({
        phase: gesture.phase === "closing" ? "closing" : "opening",
        progress: gesture.progress,
      });
    } else if (gesture.phase === "scrubbing") {
      if (previous.phase !== "scrubbing") {
        setDrawer({ phase: "open", selectedId: headings[gesture.selectedIndex]?.id });
      }

      if (
        gesture.hasScrubbed &&
        (previous.phase !== "scrubbing" || previous.selectedIndex !== gesture.selectedIndex)
      ) {
        if (gesture.selectedIndex === gesture.originIndex) {
          restoreReadingPosition(gesture.originIndex, gesture.originScrollTop);
        } else {
          scrollToHeading(gesture.selectedIndex);
        }
      }
    }
  };

  const finishGesture = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;

    if (!ownsPointer(gesture, event.pointerId)) return;

    gestureRef.current = { phase: "idle" };

    const result = releaseGesture(gesture, cancelled);
    const isHandleTouch =
      event.currentTarget === handleRef.current && event.pointerType === "touch";

    switch (result.action) {
      case "none":
        if (gesture.phase === "scrubbing" && gesture.hasScrubbed) {
          restoreReadingPosition(gesture.originIndex, gesture.originScrollTop);
        }
        break;
      case "tap":
        // the handle cancels touchstart, so a touch tap gets no click and toggles here
        if (isHandleTouch) toggle();
        break;
      case "open":
        open();
        break;
      case "close":
        close();
        break;
      case "navigate": {
        const heading = headings[result.index];
        if (heading) onNavigate?.(heading.id);

        close();
        break;
      }
      default:
        result satisfies never;
    }

    // a drag or a touch toggle has already acted, so its trailing click must not toggle again
    suppressNextClickRef.current = result.action !== "tap" || isHandleTouch;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const suppressDragClick = (event: MouseEvent<HTMLElement>) => {
    if (event.detail !== 0 && suppressNextClickRef.current) {
      resetGesture();
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    return false;
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressDragClick(event)) return;

    resetGesture();
    toggle();
  };

  // a layout change can stop the close animation, so a pending heading is followed at once
  const onViewportChange = useEffectEvent(() => {
    if (drawer.phase === "navigating") finishNavigation();
    else close();
  });

  useEffect(() => {
    const handle = handleRef.current;

    if (!handle) return;

    const media = window.matchMedia(COMPACT_LAYOUT_QUERY);
    const controller = new AbortController();
    const { signal } = controller;

    const preventBrowserGesture = (event: TouchEvent) => {
      // cancel touchstart to suppress ios safari's history swipe
      // https://bugs.webkit.org/show_bug.cgi?id=240892
      if (media.matches && event.touches.length === 1) event.preventDefault();
    };

    handle.addEventListener("touchstart", preventBrowserGesture, { passive: false, signal });
    media.addEventListener("change", onViewportChange, { signal });

    return () => {
      gestureRef.current = { phase: "idle" };
      suppressNextClickRef.current = false;
      controller.abort();
    };
  }, [hasHeadings]);

  useDismissal({ isOpen, handleRef, onDismiss: close });

  const pointerProps = {
    onPointerMove: handlePointerMove,
    onPointerUp: (event: PointerEvent<HTMLElement>) => finishGesture(event, false),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finishGesture(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) finishGesture(event, true);
    },
  };

  return {
    close,
    isOpen,
    isDragging,
    openProgress,
    scrubbedId,
    handleHeadingClick,
    finishNavigation,
    navigationProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (isOpen) startGesture(event, "list");
      },
      ...pointerProps,
      onClickCapture: suppressDragClick,
    },
    handleProps: {
      ref: handleRef,
      onClick: handleClick,
      onPointerDown: (event: PointerEvent<HTMLElement>) => startGesture(event, "handle"),
      ...pointerProps,
    },
  };
}
