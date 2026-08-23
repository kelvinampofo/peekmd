import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DropTarget from "./DropTarget";

function markdownFile(name: string, contents: string) {
  const file = new File([contents], name, { type: "text/markdown" });
  file.text = vi.fn().mockResolvedValue(contents);

  return file;
}

function dropFile(file: File) {
  fireEvent.drop(screen.getByRole("region", { name: "Markdown preview" }), {
    dataTransfer: {
      types: ["Files"],
      files: { item: () => file },
    },
  });
}

async function selectFile(file: File) {
  const user = userEvent.setup();

  await user.upload(screen.getByLabelText("Open File"), file);
}

describe("opening a Markdown file", () => {
  it.each(["notes.md", "notes.markdown"])("accepts %s files", async (name) => {
    render(<DropTarget />);

    await selectFile(markdownFile(name, `# Preview of ${name}`));

    expect(await screen.findByRole("heading", { name: `Preview of ${name}` })).toBeVisible();
  });

  it("reads and renders a dropped file's Markdown", async () => {
    render(<DropTarget />);

    dropFile(markdownFile("release-notes.md", "# Release notes\n\nThis is **ready to ship**."));

    expect(await screen.findByRole("heading", { name: "Release notes" })).toBeVisible();
    expect(screen.getByText("ready to ship")).toBeVisible();
  });

  it("rejects unsupported file types", () => {
    render(<DropTarget />);

    dropFile(new File(["plain text"], "notes.txt"));

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByText("plain text")).not.toBeInTheDocument();
  });

  it("shows a loading state while the selected file is being read", async () => {
    const file = markdownFile("slow.md", "");
    file.text = vi.fn().mockReturnValue(new Promise<string>(() => {}));

    render(<DropTarget />);

    await selectFile(file);

    expect(screen.getByRole("region", { name: "Markdown preview" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("shows an error when the selected file cannot be read", async () => {
    const file = markdownFile("unreadable.md", "");
    file.text = vi.fn().mockRejectedValue(new Error("File is unavailable"));

    render(<DropTarget />);

    await selectFile(file);

    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
