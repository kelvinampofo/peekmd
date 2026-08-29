import { render } from "vitest-browser-react";
import type { RenderResult } from "vitest-browser-react";

import DropTarget from "./DropTarget";

function markdownFile(name: string, contents: string) {
  return new File([contents], name, { type: "text/markdown" });
}

function dropFile(screen: RenderResult, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  screen
    .getByRole("region", { name: "Markdown preview" })
    .element()
    .dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }),
    );
}

async function selectFile(screen: RenderResult, file: File) {
  await screen.getByLabelText("Open File").upload(file);
}

describe("opening Markdown files", () => {
  it.each(["notes.md", "notes.markdown"])("opens %s", async (name) => {
    const screen = await render(<DropTarget />);

    await selectFile(screen, markdownFile(name, `# Preview of ${name}`));

    await expect
      .element(screen.getByRole("heading", { name: `Preview of ${name}` }))
      .toBeVisible();
  });

  it("previews dropped Markdown", async () => {
    const screen = await render(<DropTarget />);

    dropFile(
      screen,
      markdownFile("release-notes.md", "# Release notes\n\nThis is **ready to ship**."),
    );

    await expect.element(screen.getByRole("heading", { name: "Release notes" })).toBeVisible();
    await expect.element(screen.getByText("ready to ship")).toBeVisible();
  });

  it("shows an error for unsupported files", async () => {
    const screen = await render(<DropTarget />);

    dropFile(screen, new File(["plain text"], "notes.txt"));

    await expect.element(screen.getByRole("alert")).toBeVisible();
    await expect.element(screen.getByText("plain text")).not.toBeInTheDocument();
  });

  it("marks the preview busy while reading", async () => {
    vi.spyOn(File.prototype, "text").mockReturnValue(new Promise<string>(() => {}));
    const screen = await render(<DropTarget />);

    await selectFile(screen, markdownFile("slow.md", ""));

    await expect
      .element(screen.getByRole("region", { name: "Markdown preview" }))
      .toHaveAttribute("aria-busy", "true");
  });

  it("shows an error when reading fails", async () => {
    vi.spyOn(File.prototype, "text").mockRejectedValue(new Error("File is unavailable"));
    const screen = await render(<DropTarget />);

    await selectFile(screen, markdownFile("unreadable.md", ""));

    await expect.element(screen.getByRole("alert")).toBeVisible();
  });
});
