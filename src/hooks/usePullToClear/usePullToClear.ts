import { useEffect, useEffectEvent, useRef } from "react";

const CLEAR_THRESHOLD = 160;

interface UsePullToClearOptions {
  enabled: boolean;
  onClear: () => void;
}

export function usePullToClear({ enabled, onClear }: UsePullToClearOptions) {
  const scrollRef = useRef<HTMLElement>(null);
  const clear = useEffectEvent(onClear);

  useEffect(() => {
    const scroller = scrollRef.current;

    if (!scroller || !enabled) return;

    const controller = new AbortController();

    const isScrolledToEnd = () =>
      scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1;

    const reset = () => {
      scroller.removeAttribute("data-clear-pulling");
      scroller.removeAttribute("data-clear-ready");
      scroller.style.removeProperty("--clear-progress");
    };

    const updateProgress = (distance: number) => {
      const progress = Math.min(Math.max(distance / CLEAR_THRESHOLD, 0), 1);

      scroller.style.setProperty("--clear-progress", progress.toString());
      scroller.toggleAttribute("data-clear-ready", progress === 1);
    };

    const trackPull = (startY: number, gesture: AbortController) => {
      const signal = AbortSignal.any([controller.signal, gesture.signal]);

      const stop = () => {
        gesture.abort();
        reset();
      };

      const handleTouchMove = (event: TouchEvent) => {
        const touch = event.touches[0];

        if (event.touches.length !== 1 || !touch) {
          stop();
          return;
        }

        updateProgress(startY - touch.clientY);
      };

      const handleTouchEnd = (event: TouchEvent) => {
        const endY = event.changedTouches[0]?.clientY;
        const shouldClear = endY !== undefined && startY - endY >= CLEAR_THRESHOLD;

        stop();

        if (shouldClear) clear();
      };

      const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) stop();
      };

      scroller.addEventListener("touchstart", handleTouchStart, { signal });
      scroller.addEventListener("touchmove", handleTouchMove, { passive: true, signal });
      scroller.addEventListener("touchend", handleTouchEnd, { signal });
      scroller.addEventListener("touchcancel", stop, { signal });
    };

    const handleTouchStart = (event: TouchEvent) => {
      reset();

      const touch = event.touches[0];

      if (event.touches.length !== 1 || !touch || !isScrolledToEnd()) return;

      const gesture = new AbortController();
      const startY = touch.clientY;

      scroller.setAttribute("data-clear-pulling", "");
      updateProgress(0);
      trackPull(startY, gesture);
    };

    scroller.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      signal: controller.signal,
    });

    return () => {
      controller.abort();
      reset();
    };
  }, [enabled]);

  return scrollRef;
}
