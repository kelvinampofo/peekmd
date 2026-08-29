import { render } from "vitest-browser-react";

import FileInput from "./FileInput";

describe("FileInput", () => {
  it("exposes a Markdown file picker", async () => {
    const screen = await render(<FileInput onFileSelect={vi.fn()}>Open File</FileInput>);

    const input = screen.getByLabelText("Open File");

    await expect.element(input).toHaveAttribute("type", "file");
    await expect.element(input).toHaveAttribute("accept", ".md,.markdown,text/markdown");
  });

  it("reports each file selection", async () => {
    const onFileSelect = vi.fn();
    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    const screen = await render(
      <FileInput onFileSelect={onFileSelect}>Open File</FileInput>,
    );

    const input = screen.getByLabelText("Open File");

    await input.upload(file);
    await input.upload(file);

    expect(onFileSelect).toHaveBeenNthCalledWith(1, file);
    expect(onFileSelect).toHaveBeenNthCalledWith(2, file);
  });
});
