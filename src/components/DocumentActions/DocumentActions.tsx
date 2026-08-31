import type { Ref } from "react";
import FileInput from "../FileInput/FileInput";

import "./DocumentActions.css";

interface DocumentActionsProps {
  ref?: Ref<HTMLInputElement> | undefined;
  onClear: () => void;
  onFileSelect: (file: File) => void;
}

export default function DocumentActions({ ref, onClear, onFileSelect }: DocumentActionsProps) {
  return (
    <div className="document-actions">
      <button
        type="button"
        className="button button--secondary document-actions__clear"
        onClick={onClear}
      >
        Clear
      </button>
      <FileInput ref={ref} onFileSelect={onFileSelect}>
        Open File
      </FileInput>
    </div>
  );
}
