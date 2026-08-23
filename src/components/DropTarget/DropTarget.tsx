import { useRef, useState } from "react";
import { useFileDrop } from "../../hooks/useFileDrop";
import EmptyState from "../EmptyState/EmptyState";
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
          <EmptyState
            message={emptyStateMessage}
            onFileSelect={handleFileSelection}
            state={isFileDragActive ? "dragover" : "idle"}
          />
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
