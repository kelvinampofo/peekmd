import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FileInput from "./FileInput";

describe("FileInput", () => {
  it("labels and filters the native file input", () => {
    render(<FileInput onFileSelect={vi.fn()}>Open File</FileInput>);

    const input = screen.getByLabelText("Open File");

    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".md,.markdown,text/markdown");
  });

  it("reports the selected file and resets the input", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();

    const file = new File(["# Notes"], "notes.md", { type: "text/markdown" });

    render(<FileInput onFileSelect={onFileSelect}>Open File</FileInput>);

    const input = screen.getByLabelText<HTMLInputElement>("Open File");

    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(input).toHaveValue("");
  });
});
