import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import FileInput from "./FileInput";

describe("FileInput", () => {
  it("exposes a Markdown file picker", async () => {
    const screen = await render(<FileInput onFileSelect={vi.fn()} />);

    const input = screen.getByLabelText("Open File");

    await expect.element(input).toHaveAttribute("type", "file");
    await expect.element(input).toHaveAttribute("accept", ".md,.markdown,text/markdown");
  });

  it("reports each file selection", async () => {
    const onFileSelect = vi.fn();
    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });
    const screen = await render(<FileInput onFileSelect={onFileSelect} />);

    const input = screen.getByLabelText("Open File");

    await input.upload(file);
    await input.upload(file);

    expect(onFileSelect).toHaveBeenNthCalledWith(1, file);
    expect(onFileSelect).toHaveBeenNthCalledWith(2, file);
  });

  it("can be reached with the keyboard", async () => {
    const screen = await render(<FileInput onFileSelect={vi.fn()}>Open File</FileInput>);

    const input = screen.getByLabelText("Open File");
    await userEvent.tab();

    await expect.element(input).toHaveFocus();
  });

  it("keeps a childless picker out of the tab order", async () => {
    const screen = await render(
      <>
        <button>Before</button>
        <FileInput onFileSelect={vi.fn()} />
        <button>After</button>
      </>,
    );

    await userEvent.tab();
    await expect.element(screen.getByRole("button", { name: "Before" })).toHaveFocus();

    await userEvent.tab();
    await expect.element(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });
});
