import { useRef, useState } from "react";
import { useFileDrop } from "./hooks/useFileDrop/useFileDrop";
import { usePullToClear } from "./hooks/usePullToClear/usePullToClear";
import { useShortcuts } from "./hooks/useShortcuts/useShortcuts";

import DocumentActions from "./components/DocumentActions/DocumentActions";
import DropTarget from "./components/DropTarget/DropTarget";
import EmptyState from "./components/EmptyState/EmptyState";
import MarkdownPreview from "./components/MarkdownPreview/MarkdownPreview";

import "./MarkdownPreviewer.css";

type FileReadState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "loaded"; source: string }
  | { status: "error"; message: string };

export default function MarkdownPreviewer() {
  const [fileReadState, setFileReadState] = useState<FileReadState>({ status: "idle" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestReadId = useRef(0);

  const { isFileDragActive, dropHandlers } = useFileDrop(handleFileOpen);

  const scrollRef = usePullToClear({
    enabled: fileReadState.status === "loaded",
    onClear: clearPreview,
  });

  useShortcuts({
    C: clearPreview,
    O: openFilePicker,
  });

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function clearPreview() {
    latestReadId.current += 1;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setFileReadState({ status: "idle" });
  }

  async function readMarkdownFile(file: File | null) {
    latestReadId.current += 1;
    const currentReadId = latestReadId.current;

    const fileName = file?.name.toLowerCase();
    const isMarkdownFile = fileName?.endsWith(".md") || fileName?.endsWith(".markdown");

    if (!file || !isMarkdownFile) {
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

  function handleFileOpen(file: File) {
    void readMarkdownFile(file);
  }

  return (
    <main className="workspace">
      <DropTarget
        ref={scrollRef}
        aria-label="Markdown preview"
        aria-busy={fileReadState.status === "reading"}
        isDraggingOver={isFileDragActive}
        isLoaded={fileReadState.status === "loaded"}
        {...dropHandlers}
      >
        {fileReadState.status === "loaded" ? (
          <>
            <MarkdownPreview source={fileReadState.source} />
            <DocumentActions
              ref={fileInputRef}
              onClear={clearPreview}
              onFileSelect={handleFileOpen}
            />
          </>
        ) : (
          <EmptyState
            ref={fileInputRef}
            message={isFileDragActive ? "Drop to preview" : "Drop a Markdown file"}
            onFileSelect={handleFileOpen}
            state={isFileDragActive ? "dragover" : "idle"}
          />
        )}
        {fileReadState.status === "error" ? (
          <p className="document-window__status" role="alert">
            {fileReadState.message}
          </p>
        ) : null}
      </DropTarget>
    </main>
  );
}
