import { useState } from "react";
import type { DragEvent } from "react";

type FileDropHandler = (file: File) => void;

interface UseFileDropResult {
  isFileDragActive: boolean;
  dropHandlers: {
    onDragEnter: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
}

function isFileDrag(dataTransfer: DataTransfer) {
  return dataTransfer.types.includes("Files");
}

/**
 * Creates event handlers for a drop target and tracks whether a file is currently being dragged over it.
 *
 * @param onFileDrop - Called with the first file when one or more files are dropped.
 * @returns The drop target's active state and event handlers to spread onto
 * the target element.
 */
export function useFileDrop(onFileDrop: FileDropHandler): UseFileDropResult {
  const [isFileDragActive, setIsFileDragActive] = useState(false);

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;

    setIsFileDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;

    // cancelling dragover makes this element a drop target
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    const hasLeftDropTarget =
      !(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget);

    if (hasLeftDropTarget) {
      setIsFileDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!isFileDrag(event.dataTransfer)) return;

    event.preventDefault();
    event.stopPropagation();
    setIsFileDragActive(false);

    const file = event.dataTransfer.files.item(0);

    if (file) {
      onFileDrop(file);
    }
  };

  return {
    isFileDragActive,
    dropHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
