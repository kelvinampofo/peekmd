import type { ComponentPropsWithRef } from "react";

import "./DropTarget.css";

interface DropTargetProps extends Omit<ComponentPropsWithRef<"section">, "className"> {
  isDraggingOver: boolean;
  isLoaded: boolean;
}

export default function DropTarget({ isDraggingOver, isLoaded, ...props }: DropTargetProps) {
  return (
    <section
      {...props}
      className="document-window"
      data-dragging={isDraggingOver || undefined}
      data-loaded={isLoaded || undefined}
    />
  );
}
