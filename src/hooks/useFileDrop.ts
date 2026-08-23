import { useState } from "react";
import type { DragEvent } from "react";

type DataTransferDropHandler = (dataTransfer: DataTransfer) => void;

function hasFilesInDragDataStore(dataTransfer: DataTransfer) {
  return dataTransfer.types.includes("Files");
}

export function useFileDrop(onDataTransferDrop: DataTransferDropHandler) {
  const [isFileOverDropTarget, setIsFileOverDropTarget] = useState(false);

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasFilesInDragDataStore(event.dataTransfer)) return;

    setIsFileOverDropTarget(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasFilesInDragDataStore(event.dataTransfer)) return;

    // Cancelling dragover makes this element a drop target.
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    const hasLeftDropTarget =
      !(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget);

    if (hasLeftDropTarget) {
      setIsFileOverDropTarget(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasFilesInDragDataStore(event.dataTransfer)) return;

    event.preventDefault();
    event.stopPropagation();
    setIsFileOverDropTarget(false);
    onDataTransferDrop(event.dataTransfer);
  };

  return {
    isFileOverDropTarget,
    dropTargetEventHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}
