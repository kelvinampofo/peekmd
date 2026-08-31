import { createRef } from "react";
import { render } from "vitest-browser-react";

import DocumentActions from "./DocumentActions";

describe("DocumentActions", () => {
  it("clears when clicked", async () => {
    const onClear = vi.fn();
    const screen = await render(<DocumentActions onClear={onClear} onFileSelect={vi.fn()} />);

    await screen.getByRole("button", { name: "Clear Preview" }).click();

    expect(onClear).toHaveBeenCalledOnce();
  });

  it("reports a file selection", async () => {
    const onFileSelect = vi.fn();
    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    const screen = await render(<DocumentActions onClear={vi.fn()} onFileSelect={onFileSelect} />);

    await screen.getByLabelText("Open File").upload(file);

    expect(onFileSelect).toHaveBeenCalledOnce();
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("exposes the file input through its ref", async () => {
    const inputRef = createRef<HTMLInputElement>();
    const screen = await render(
      <DocumentActions ref={inputRef} onClear={vi.fn()} onFileSelect={vi.fn()} />,
    );

    expect(inputRef.current).toBe(screen.getByLabelText("Open File").element());
  });
});
