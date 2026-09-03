import { parseMarkdown } from "@tanstack/markdown";
import { render } from "vitest-browser-react";

import Article from "./Article";

describe("Article", () => {
  it("renders Markdown as an accessible document", async () => {
    const document = parseMarkdown(
      [
        "# Think Different",
        "",
        "> Here’s to the **crazy ones**.",
        "",
        "— [Apple](https://www.apple.com/)",
      ].join("\n"),
    );

    const screen = await render(<Article document={document} />);

    const article = screen.getByRole("article");

    await expect.element(article).toBeVisible();
    await expect.element(article).toMatchAriaInlineSnapshot(`
      - article:
        - heading "Think Different" [level=1]
        - blockquote:
          - paragraph:
            - text: Here’s to the
            - strong: crazy ones
            - text: .
        - paragraph:
          - text: —
          - link "Apple":
            - /url: https://www.apple.com/
    `);
  });
});
