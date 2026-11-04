import type { ComponentPropsWithRef, CSSProperties, ReactNode, Ref } from "react";

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
  "--table-of-contents-blur": string;
  "--table-of-contents-handle-offset": `${number}px`;
  "--table-of-contents-handle-travel-correction": `${number}px`;
  "--table-of-contents-open-progress": number;
  "--table-of-contents-reveal": `${number}%`;
}

export default function Drawer({
  ref,
  isOpen,
  isDragging,
  openProgress,
  handleProps,
  children,
}: DrawerProps) {
  const handleShapeProgress = isOpen ? 0 : openProgress;
  const handlePointX = 4 + handleShapeProgress * 10;
  const revealProgress = isOpen ? openProgress : 0;
  const handleOffset = isOpen ? 32 : 4 + openProgress * 8;

  const style: DrawerStyle = {
    "--table-of-contents-blur": `${openProgress * 18}px`,
    "--table-of-contents-handle-offset": `${handleOffset}px`,
    "--table-of-contents-handle-travel-correction": `${revealProgress * 44}px`,
    "--table-of-contents-open-progress": openProgress,
    "--table-of-contents-reveal": `${revealProgress * 100}%`,
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
            className="table-of-contents-handle__stroke table-of-contents-handle__stroke--secondary"
            d={`M 4 4 L ${handlePointX} 20 L 4 36`}
          />
        </svg>
      </button>
      <div className="table-of-contents-surface">
        <div className="table-of-contents-drawer__content">{children}</div>
      </div>
    </div>
  );
}
