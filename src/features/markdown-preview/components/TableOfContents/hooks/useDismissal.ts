import { useEffect, useEffectEvent, type RefObject } from "react";

interface DismissalOptions {
  isOpen: boolean;
  drawerRef: RefObject<HTMLDivElement | null>;
  handleRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
}

export function useDismissal({ isOpen, drawerRef, handleRef, onDismiss }: DismissalOptions): void {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (
        event.target instanceof Node &&
        (drawerRef.current?.querySelector(".table-of-contents-surface")?.contains(event.target) ||
          handleRef.current?.contains(event.target))
      )
        return;

      dismiss();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    const controller = new AbortController();
    const { signal } = controller;

    window.addEventListener("click", handleOutsideClick, { signal });
    window.addEventListener("keydown", handleKeyDown, { signal });

    return () => controller.abort();
  }, [drawerRef, handleRef, isOpen]);
}
