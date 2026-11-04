import { useEffect, useEffectEvent, type RefObject } from "react";

interface DismissalOptions {
  isOpen: boolean;
  handleRef: RefObject<HTMLButtonElement | null>;
  onDismiss: () => void;
}

export function useDismissal({ isOpen, handleRef, onDismiss }: DismissalOptions): void {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && handleRef.current?.contains(event.target)) return;

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
  }, [handleRef, isOpen]);
}
