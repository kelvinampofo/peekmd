import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

import "./FileInput.css";

interface FileInputProps {
  children: ReactNode;
  onFileSelect: (file: File) => void;
}

export default function FileInput({ children, onFileSelect }: FileInputProps) {
  const id = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);

    if (file) {
      onFileSelect(file);
    }

    // allow choosing the same file again after it has changed on disk
    event.target.value = "";
  }

  return (
    <label className="file-input__label" htmlFor={id}>
      {children}
      <input
        id={id}
        className="file-input__control"
        type="file"
        accept=".md,.markdown,text/markdown"
        onChange={handleChange}
      />
    </label>
  );
}
