import { createRef } from "react";
import { render } from "vitest-browser-react";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("offers an accessible way to open a file", async () => {
    const screen = await render(
      <EmptyState message="Drop a Markdown file" onFileSelect={vi.fn()} state="idle" />,
    );

    await expect.element(screen.getByText("Drop a Markdown file")).toBeVisible();
    await expect.element(screen.getByLabelText("Open File")).toBeInTheDocument();
  });

  it("reports the file selected by the user", async () => {
    const onFileSelect = vi.fn();
    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    const screen = await render(
      <EmptyState message="Drop a Markdown file" onFileSelect={onFileSelect} state="idle" />,
    );

    await screen.getByLabelText("Open File").upload(file);

    expect(onFileSelect).toHaveBeenCalledOnce();
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("exposes the file input through its ref", async () => {
    const inputRef = createRef<HTMLInputElement>();
    const screen = await render(
      <EmptyState
        ref={inputRef}
        message="Drop a Markdown file"
        onFileSelect={vi.fn()}
        state="idle"
      />,
    );

    expect(inputRef.current).toBe(screen.getByLabelText("Open File").element());
  });
});
