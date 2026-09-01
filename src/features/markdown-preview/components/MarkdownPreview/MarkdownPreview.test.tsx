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

    const article = screen.getByRole("article");

    await expect.element(article).toBeVisible();
    await expect.element(article).toMatchAriaInlineSnapshot(`
      - article:
        - heading "Release notes" [level=1]
        - paragraph:
          - text: This is
          - strong: ready
          - text: with
          - link "details":
            - /url: https://example.com/notes
          - text: .
        - list:
          - listitem: Fast
          - listitem: Small
    `);
  });
});
