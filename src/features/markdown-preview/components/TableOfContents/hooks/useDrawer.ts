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
  releaseGesture,
  type GestureSource,
  type GestureState,
} from "../gestures/drawer";
import { useDismissal } from "./useDismissal";

type DrawerState =
  | { phase: "closed" }
  | { phase: "opening"; progress: number }
  | { phase: "closing"; progress: number }
  | { phase: "open"; selectedId: Heading["id"] | undefined };

interface DrawerOptions {
  contentRootRef: RefObject<HTMLElement | null>;
  currentIndex: number;
  headings: readonly Heading[];
  onNavigate?: (id: Heading["id"]) => void;
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

    const target = contentRoot.querySelector(`#${CSS.escape(heading.id)}`);

    target?.scrollIntoView({ behavior: "instant", block: "start" });
    setDrawer({ phase: "open", selectedId: heading.id });
  };

  const startGesture = (event: PointerEvent<HTMLElement>, source: GestureSource) => {
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
      source,
    };

    if (source === "handle") event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
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
        scrollToHeading(gesture.selectedIndex);
      }
    }
  };

  const finishGesture = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const gesture = gestureRef.current;

    if (!("pointerId" in gesture) || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = { phase: "idle" };

    const result = releaseGesture(gesture, cancelled);
    const isHandleTouch =
      event.currentTarget === handleRef.current && event.pointerType === "touch";

    switch (result.action) {
      case "none":
        break;
      case "toggle":
        if (isHandleTouch) toggle();
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

    if (cancelled || gesture.phase !== "pressed" || isHandleTouch) {
      gestureRef.current = { phase: "released" };
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const suppressDragClick = (event: MouseEvent<HTMLElement>) => {
    if (event.detail !== 0 && gestureRef.current.phase === "released") {
      gestureRef.current = { phase: "idle" };
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    return false;
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressDragClick(event)) return;

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
