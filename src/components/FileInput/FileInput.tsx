import type { ChangeEvent, PropsWithChildren, Ref } from "react";

import "./FileInput.css";

interface FileInputProps {
  ref?: Ref<HTMLInputElement> | undefined;
  onFileSelect: (file: File) => void;
}

export default function FileInput({
  children,
  ref,
  onFileSelect,
}: PropsWithChildren<FileInputProps>) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(0);

    if (file) {
      onFileSelect(file);
    }

    // allow choosing the same file again after it has changed on disk
    event.target.value = "";
  }

  const input = (
    <input
      ref={ref}
      className="file-input__control"
      type="file"
      accept=".md,.markdown,text/markdown"
      aria-label={children ? undefined : "Open File"}
      tabIndex={children ? undefined : -1}
      onChange={handleChange}
    />
  );

  return children ? (
    <label className="button file-input__label">
      {children}
      {input}
    </label>
  ) : (
    input
  );
}
