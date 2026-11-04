import type { ComponentPropsWithRef, CSSProperties, ReactNode, Ref } from "react";

import { lerp } from "../../../../../utils/math";

import "./Drawer.css";

interface DrawerProps {
  ref: Ref<HTMLDivElement>;
  isOpen: boolean;
  isDragging: boolean;
  openProgress: number;
  handleProps: ComponentPropsWithRef<"button">;
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
  children,
}: DrawerProps) {
  const revealProgress = isOpen ? openProgress : 0;
  const handleShapeProgress = isOpen ? 0 : openProgress;
  const chevronBend = lerp(0, 10 / 16, handleShapeProgress);
  const handleOffset = isOpen ? 24 : lerp(12, 20, openProgress);

  const style: DrawerStyle = {
    "--table-of-contents-handle-offset": `${handleOffset}px`,
    "--table-of-contents-chevron-bend": chevronBend,
    "--table-of-contents-reveal": revealProgress,
  };

  return (
    <div
      className="table-of-contents-drawer"
      data-dragging={isDragging || undefined}
      data-open={isOpen || undefined}
      ref={ref}
      style={style}
    >
      <button
        aria-controls="table-of-contents-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close table of contents" : "Open table of contents"}
        className="table-of-contents-handle"
        data-gesture-control=""
        {...handleProps}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 28 40">
          <path
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--upper"
            d="M 4 4 V 20"
          />
          <path
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--lower"
            d="M 4 20 V 36"
          />
        </svg>
      </button>
      <div className="table-of-contents-surface">
        <div className="table-of-contents-drawer__content">{children}</div>
      </div>
    </div>
  );
}
