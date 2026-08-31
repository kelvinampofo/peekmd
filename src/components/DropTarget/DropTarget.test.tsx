import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { RenderResult } from "vitest-browser-react";

import { startPull, touchEvent } from "../../test/touch";
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

function documentWindow(screen: RenderResult) {
  return screen.getByRole("region", { name: "Markdown preview" }).element();
}

async function pullToClear(screen: RenderResult) {
  const scroller = documentWindow(screen);

  await new Promise(requestAnimationFrame);

  const endY = await vi.waitFor(() => {
    const pullEndY = startPull(scroller, 200);
    expect(scroller.hasAttribute("data-clear-ready")).toBe(true);

    return pullEndY;
  });

  expect(scroller.scrollTop).toBeGreaterThan(0);

  scroller.dispatchEvent(touchEvent("touchend", [endY]));

  return scroller;
}

describe("DropTarget", () => {
  describe("opening files", () => {
    it.each(["notes.md", "notes.markdown", "NOTES.MD", "Notes.Markdown"])(
      "opens %s",
      async (name) => {
        const screen = await render(<DropTarget />);

        await selectFile(screen, markdownFile(name, `# Preview of ${name}`));

        await expect
          .element(screen.getByRole("heading", { name: `Preview of ${name}` }))
          .toBeVisible();
      },
    );

    it("opens an empty document", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("empty.md", ""));

      await expect.element(screen.getByRole("article")).toBeInTheDocument();
      await expect.element(screen.getByText("Drop a Markdown file")).not.toBeInTheDocument();
    });

    it("previews a dropped file", async () => {
      const screen = await render(<DropTarget />);

      dropFile(
        screen,
        markdownFile("release-notes.md", "# Release notes\n\nThis is **ready to ship**."),
      );

      await expect.element(screen.getByRole("heading", { name: "Release notes" })).toBeVisible();
      await expect.element(screen.getByText("ready to ship")).toBeVisible();
    });

    it("replaces the current preview", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("first.md", "# First document"));
      await expect.element(screen.getByRole("heading", { name: "First document" })).toBeVisible();

      await selectFile(screen, markdownFile("second.md", "# Second document"));

      await expect.element(screen.getByRole("heading", { name: "Second document" })).toBeVisible();
      await expect
        .element(screen.getByRole("heading", { name: "First document" }))
        .not.toBeInTheDocument();
    });
  });

  describe("shortcuts", () => {
    it("'C' clears the preview", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("notes.md", "# Notes"));
      await expect.element(screen.getByRole("heading", { name: "Notes" })).toBeVisible();

      await userEvent.keyboard("c");

      await expect.element(screen.getByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
      await expect.element(screen.getByText("Drop a Markdown file")).toBeVisible();
    });

    it("'O' opens the file picker", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("notes.md", "# Notes"));
      const click = vi.spyOn(HTMLInputElement.prototype, "click");

      await userEvent.keyboard("o");

      expect(click).toHaveBeenCalledOnce();
    });
  });

  describe("pulling past the end of a document", () => {
    it("returns to the top of the empty state after clearing the preview", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("notes.md", "# Notes"));
      await expect.element(screen.getByRole("heading", { name: "Notes" })).toBeVisible();

      const article = screen.getByRole("article").element();
      article.style.height = "2000px";

      const scroller = await pullToClear(screen);

      await expect.element(screen.getByRole("heading", { name: "Notes" })).not.toBeInTheDocument();
      await expect.element(screen.getByText("Drop a Markdown file")).toBeVisible();
      expect(scroller.scrollTop).toBe(0);
    });
  });

  describe("actions at the end of a document", () => {
    it("hides touch actions for a precise pointer", async () => {
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("notes.md", "# Notes"));

      await expect.element(screen.getByText("Clear")).not.toBeVisible();
      await expect.element(screen.getByText("Open File")).not.toBeVisible();
    });
  });

  describe("file reading", () => {
    it("rejects unsupported files", async () => {
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

    it("ignores a read completed after clearing", async () => {
      const pendingRead = Promise.withResolvers<string>();
      vi.spyOn(File.prototype, "text").mockReturnValue(pendingRead.promise);
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("slow.md", ""));
      await expect
        .element(screen.getByRole("region", { name: "Markdown preview" }))
        .toHaveAttribute("aria-busy", "true");

      await userEvent.keyboard("c");
      pendingRead.resolve("# Stale preview");
      await pendingRead.promise;
      await new Promise(requestAnimationFrame);

      await expect
        .element(screen.getByRole("heading", { name: "Stale preview" }))
        .not.toBeInTheDocument();
      await expect.element(screen.getByText("Drop a Markdown file")).toBeVisible();
    });

    it("keeps the latest selection when reads finish out of order", async () => {
      const firstRead = Promise.withResolvers<string>();
      const secondRead = Promise.withResolvers<string>();
      const reads = new Map([
        ["first.md", firstRead.promise],
        ["second.md", secondRead.promise],
      ]);
      vi.spyOn(File.prototype, "text").mockImplementation(function (this: File) {
        return reads.get(this.name) ?? Promise.reject(new Error(`Unexpected file: ${this.name}`));
      });
      const screen = await render(<DropTarget />);

      await selectFile(screen, markdownFile("first.md", ""));
      await selectFile(screen, markdownFile("second.md", ""));

      secondRead.resolve("# Second document");
      await expect.element(screen.getByRole("heading", { name: "Second document" })).toBeVisible();

      firstRead.resolve("# First document");
      await firstRead.promise;
      await new Promise(requestAnimationFrame);

      await expect
        .element(screen.getByRole("heading", { name: "First document" }))
        .not.toBeInTheDocument();
      await expect.element(screen.getByRole("heading", { name: "Second document" })).toBeVisible();
    });
  });
});
