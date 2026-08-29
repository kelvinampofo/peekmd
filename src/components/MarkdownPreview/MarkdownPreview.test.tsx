import { render } from "vitest-browser-react";

import MarkdownPreview from "./MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders Markdown as an accessible document", async () => {
    const screen = await render(
      <MarkdownPreview
        source={[
          "# Release notes",
          "",
          "This is **ready** with [details](https://example.com/notes).",
          "",
          "- Fast",
          "- Small",
        ].join("\n")}
      />,
    );

    await expect.element(screen.getByRole("article")).toBeVisible();
    await expect
      .element(screen.getByRole("heading", { level: 1, name: "Release notes" }))
      .toBeVisible();
    expect(screen.getByText("ready").element().tagName).toBe("STRONG");
    await expect
      .element(screen.getByRole("link", { name: "details" }))
      .toHaveAttribute("href", "https://example.com/notes");
    await expect.element(screen.getByText("Fast")).toBeVisible();
    await expect.element(screen.getByText("Small")).toBeVisible();
  });

  it("replaces the document when the source changes", async () => {
    const screen = await render(<MarkdownPreview source="# First document" />);

    await screen.rerender(<MarkdownPreview source="# Replacement document" />);

    await expect
      .element(screen.getByRole("heading", { name: "First document" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("heading", { name: "Replacement document" }))
      .toBeVisible();
  });

  it("renders a large document completely", async () => {
    const source = Array.from({ length: 1_000 }, (_, index) => `- Item ${index + 1}`).join("\n");
    const screen = await render(<MarkdownPreview source={source} />);

    await expect.element(screen.getByText("Item 1", { exact: true })).toBeVisible();
    await expect.element(screen.getByText("Item 1000", { exact: true })).toBeVisible();
  });
});
