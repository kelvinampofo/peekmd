import { useRef, useState } from "react";
import { useFileDrop } from "../../hooks/useFileDrop";
import FileInput from "../FileInput/FileInput";
import MarkdownPreview from "../MarkdownPreview/MarkdownPreview";

import "./DropTarget.css";

function isMarkdownFile(file: File) {
  const fileName = file.name.toLowerCase();
  const fileExtensions = [".md", ".markdown"];

  return fileExtensions.some((extension) => fileName.endsWith(extension));
}

type FileReadState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "loaded"; source: string }
  | { status: "error"; message: string };

export default function DropTarget() {
  const [fileReadState, setFileReadState] = useState<FileReadState>({ status: "idle" });
  const latestReadId = useRef(0);

  const { isFileDragActive, dropHandlers } = useFileDrop(readDroppedMarkdownFile);

  function readDroppedMarkdownFile(dataTransfer: DataTransfer) {
    void readMarkdownFile(dataTransfer.files.item(0));
  }

  async function readMarkdownFile(file: File | null) {
    latestReadId.current += 1;
    const currentReadId = latestReadId.current;

    if (!file || !isMarkdownFile(file)) {
      setFileReadState({
        status: "error",
        message: "Drop a Markdown (.md or .markdown) file.",
      });
      return;
    }

    setFileReadState({ status: "reading" });

    try {
      const source = await file.text();

      if (currentReadId === latestReadId.current) {
        setFileReadState({ status: "loaded", source });
      }
    } catch {
      if (currentReadId === latestReadId.current) {
        setFileReadState({
          status: "error",
          message: "This file could not be read. Please try another one.",
        });
      }
    }
  }

  function handleFileSelection(file: File) {
    void readMarkdownFile(file);
  }

  const emptyStateMessage = isFileDragActive
    ? "Drop to preview"
    : fileReadState.status === "reading"
      ? "Reading file..."
      : "Drop a Markdown file";

  return (
    <main className="workspace">
      <section
        className="document-window"
        aria-label="Markdown preview"
        aria-busy={fileReadState.status === "reading"}
        data-dragging={isFileDragActive || undefined}
        {...dropHandlers}
      >
        {fileReadState.status === "loaded" ? (
          <MarkdownPreview source={fileReadState.source} />
        ) : (
          <EmptyState message={emptyStateMessage} onFileSelect={handleFileSelection} />
        )}

        {fileReadState.status === "error" ? (
          <p className="document-window__status" role="alert">
            {fileReadState.message}
          </p>
        ) : null}
      </section>
    </main>
  );
}

interface EmptyStateProps {
  message: string;
  onFileSelect: (file: File) => void;
}

export function EmptyState({ message, onFileSelect }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__document-fan" aria-hidden="true">
        <DocumentIcon position="left" />
        <DocumentIcon position="center" />
        <DocumentIcon position="right" />
      </div>
      <p>{message}</p>
      <span>or</span>
      <FileInput onFileSelect={onFileSelect}>Open File</FileInput>
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
        d="M3.5 1.5H8.5L12.5 5.5V12.5C12.5 13.0523 12.0523 13.5 11.5 13.5H3.5C2.94772 13.5 2.5 13.0523 2.5 12.5V2.5C2.5 1.94772 2.94772 1.5 3.5 1.5Z"
        fill="var(--color-background)"
      />
      <path
        d="M3.5 2C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V6H8.5C8.22386 6 8 5.77614 8 5.5V2H3.5ZM9 2.70711L11.2929 5H9V2.70711ZM2 2.5C2 1.67157 2.67157 1 3.5 1H8.5C8.63261 1 8.75979 1.05268 8.85355 1.14645L12.8536 5.14645C12.9473 5.24021 13 5.36739 13 5.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V2.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
