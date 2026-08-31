import type { Ref } from "react";
import FileInput from "../FileInput/FileInput";

import "./EmptyState.css";

interface EmptyStateProps {
  ref?: Ref<HTMLInputElement> | undefined;
  message: string;
  onFileSelect: (file: File) => void;
  state: "idle" | "dragover";
}

export default function EmptyState({ ref, message, onFileSelect, state }: EmptyStateProps) {
  return (
    <div className="empty-state" data-state={state}>
      <div className="empty-state__document-fan" aria-hidden="true">
        <DocumentIcon position="left" />
        <DocumentIcon position="center" />
        <DocumentIcon position="right" />
      </div>
      <p>{message}</p>
      <span>or</span>
      <FileInput ref={ref} onFileSelect={onFileSelect}>
        Open File
      </FileInput>
    </div>
  );
}

interface DocumentIconProps {
  position: "left" | "center" | "right";
}

function DocumentIcon({ position }: DocumentIconProps) {
  return (
    <svg
      className="empty-state__document-icon"
      data-position={position}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.5 1.5h5l4 4v7a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        fill="var(--color-background)"
      />
      <path
        d="M3.5 2a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V6H8.5a.5.5 0 0 1-.5-.5V2Zm5.5.7L11.3 5H9ZM2 2.5A1.5 1.5 0 0 1 3.5 1h5c.13 0 .26.05.35.15l4 4c.1.09.15.22.15.35v7a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
