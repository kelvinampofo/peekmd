import {
  useEffect,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type TransitionEvent,
} from "react";

import { lerp } from "../../../../../utils/math";

import "./Drawer.css";

interface DrawerProps {
  ref: Ref<HTMLDivElement>;
  isOpen: boolean;
  isDragging: boolean;
  openProgress: number;
  handleProps: ComponentPropsWithRef<"button">;
  onCloseComplete: () => void;
  children: ReactNode;
}

interface DrawerStyle extends CSSProperties {
  "--table-of-contents-handle-offset": `${number}px`;
  "--table-of-contents-chevron-bend": number;
  "--table-of-contents-reveal": number;
}

export default function Drawer({
  ref,
  isOpen,
  isDragging,
  openProgress,
  handleProps,
  onCloseComplete,
  children,
}: DrawerProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPointerFocus, setIsPointerFocus] = useState(false);

  useEffect(() => {
    const showKeyboardFocus = () => setIsPointerFocus(false);
    document.addEventListener("keydown", showKeyboardFocus, true);
    return () => document.removeEventListener("keydown", showKeyboardFocus, true);
  }, []);

  const dismissHint = () => setHasInteracted(true);

  const revealProgress = isOpen ? openProgress : 0;
  const handleShapeProgress = isOpen ? openProgress - 1 : openProgress;
  const chevronBend = lerp(0, 10 / 18, handleShapeProgress);
  const handleOffset = isOpen ? 24 : lerp(12, 20, openProgress);

  const style: DrawerStyle = {
    "--table-of-contents-handle-offset": `${handleOffset}px`,
    "--table-of-contents-chevron-bend": chevronBend,
    "--table-of-contents-reveal": revealProgress,
  };

  const handleTransitionComplete = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "translate" || isOpen) {
      return;
    }

    if (event.currentTarget.getBoundingClientRect().right <= 0.5) onCloseComplete();
  };

  return (
    <div
      className="table-of-contents-drawer"
      data-dragging={isDragging || undefined}
      data-open={isOpen || undefined}
      data-pointer-focus={isPointerFocus || undefined}
      onPointerDownCapture={() => setIsPointerFocus(true)}
      ref={ref}
      style={style}
    >
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close table of contents" : "Open table of contents"}
        className="table-of-contents-handle"
        data-gesture-control=""
        data-hint-dismissed={hasInteracted || isOpen || isDragging || undefined}
        {...handleProps}
        onPointerDownCapture={dismissHint}
        onClickCapture={dismissHint}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 28 44">
          <path
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--upper"
            d="M 4 4 V 22"
          />
          <path
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--lower"
            d="M 4 22 V 40"
          />
        </svg>
      </button>
      <div
        className="table-of-contents-surface"
        onTransitionEnd={handleTransitionComplete}
        onTransitionCancel={handleTransitionComplete}
      >
        <div className="table-of-contents-drawer__content">{children}</div>
      </div>
    </div>
  );
}
