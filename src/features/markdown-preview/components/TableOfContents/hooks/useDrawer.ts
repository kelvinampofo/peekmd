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
import { moveGesture, releaseGesture, type GestureState } from "../gestures/drawer";
import { useDismissal } from "./useDismissal";

type DrawerState =
  | { phase: "closed" }
  | { phase: "opening"; progress: number }
  | { phase: "closing"; progress: number }
  | { phase: "open"; selectedId: string | undefined };

interface DrawerOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  currentIndex: number;
  headings: readonly Heading[];
  onNavigate?: (id: string) => void;
}

export function useDrawer({ contentRootRef, currentIndex, headings, onNavigate }: DrawerOptions) {
  const handleRef = useRef<HTMLButtonElement>(null);
  const gestureRef = useRef<GestureState>({ phase: "idle" });

  const [drawer, setDrawer] = useState<DrawerState>({ phase: "closed" });

  const isOpen = drawer.phase === "open" || drawer.phase === "closing";
  const isDragging = drawer.phase === "opening" || drawer.phase === "closing";
  const openProgress = isDragging ? drawer.progress : isOpen ? 1 : 0;
  const scrubbedId = drawer.phase === "open" ? drawer.selectedId : undefined;

  const close = () => {
    gestureRef.current = { phase: "idle" };
    setDrawer({ phase: "closed" });
  };

  const toggle = () => {
    if (isOpen) close();
    else setDrawer({ phase: "open", selectedId: headings[currentIndex]?.id });
  };

  const scrollToHeading = (index: number) => {
    const heading = headings[index];
    const contentRoot = contentRootRef.current;

    if (!heading || !contentRoot) return;

    const target = Array.from(contentRoot.querySelectorAll("[id]")).find(
      (element) => element.id === heading.id,
    );

    target?.scrollIntoView({ behavior: "instant", block: "start" });
    setDrawer({ phase: "open", selectedId: heading.id });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      headings.length === 0 ||
      !window.matchMedia("(max-width: 900px)").matches
    ) {
      return;
    }

    gestureRef.current = {
      phase: "pressed",
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      startedOpen: isOpen,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const previous = gestureRef.current;

    if (!("pointerId" in previous) || previous.pointerId !== event.pointerId) return;

    const gesture = moveGesture(
      previous,
      { x: event.clientX, y: event.clientY },
      {
        currentIndex,
        headingCount: headings.length,
        travelDistance: Math.max(window.innerWidth, 1),
      },
    );

    gestureRef.current = gesture;

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
        scrollToHeading(gesture.selectedIndex);
      }
    }
  };

  const finishGesture = (event: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;

    if (!("pointerId" in gesture) || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = { phase: "idle" };

    const result = releaseGesture(gesture, cancelled);

    switch (result.action) {
      case "none":
        break;
      case "toggle":
        if (event.pointerType === "touch") toggle();
        break;
      case "open":
        setDrawer({ phase: "open", selectedId: headings[currentIndex]?.id });
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

    if (cancelled || gesture.phase !== "pressed" || event.pointerType === "touch") {
      gestureRef.current = { phase: "released" };
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 && gestureRef.current.phase === "released") {
      gestureRef.current = { phase: "idle" };
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    gestureRef.current = { phase: "idle" };
    toggle();
  };

  const onViewportChange = useEffectEvent(close);

  useEffect(() => {
    const handle = handleRef.current;

    if (!handle) return;

    const media = window.matchMedia("(max-width: 900px)");
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
      controller.abort();
    };
  }, [headings]);

  useDismissal({ isOpen, handleRef, onDismiss: close });

  return {
    close,
    isOpen,
    isDragging,
    openProgress,
    scrubbedId,
    handleProps: {
      ref: handleRef,
      onClick: handleClick,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finishGesture(event, false),
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finishGesture(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finishGesture(event, true),
    },
  };
}
