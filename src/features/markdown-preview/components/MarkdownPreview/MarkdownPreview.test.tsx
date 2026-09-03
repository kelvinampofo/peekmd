import { useRef } from "react";
import { render } from "vitest-browser-react";

import MarkdownPreview from "./MarkdownPreview";

function Preview({ source }: { source: string }) {
  const scrollContainerRef = useRef<HTMLElement>(null);

  return (
    <section ref={scrollContainerRef} aria-label="Preview scroller">
      <MarkdownPreview source={source} scrollContainerRef={scrollContainerRef} />
    </section>
  );
}

describe("MarkdownPreview", () => {
  it("renders Markdown as an accessible document", async () => {
    const screen = await render(
      <Preview
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

  it("lists every heading with its level and matching target", async () => {
    const screen = await render(
      <Preview source={"# One\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six"} />,
    );

    const outline = screen.getByRole("navigation", { name: "Table of contents" }).element();
    const links = outline.querySelectorAll<HTMLAnchorElement>("a");

    expect(links).toHaveLength(6);
    expect(outline.querySelectorAll(".table-of-contents__scroll-thumb")).toHaveLength(1);
    links.forEach((link, index) => {
      const level = String(index + 1);

      expect(link.getAttribute("href")).toBe(`#${link.textContent?.toLowerCase()}`);
      expect(link.closest("li")?.dataset.level).toBe(level);
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    });
  });

  it("uses rendered text and duplicate-safe IDs for formatted headings", async () => {
    await render(<Preview source={"# **Release** `notes`!\n\n# **Release** `notes`!"} />);

    const links = document.querySelectorAll<HTMLAnchorElement>(
      '.table-of-contents__link[href^="#release-notes"]',
    );

    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe("Release notes!");
    expect(links[0]?.getAttribute("href")).toBe("#release-notes");
    expect(links[1]?.textContent).toBe("Release notes!");
    expect(links[1]?.getAttribute("href")).toBe("#release-notes-2");
    expect(document.getElementById("release-notes")).not.toBeNull();
    expect(document.getElementById("release-notes-2")).not.toBeNull();
  });

  it("omits the table of contents when there are no headings", async () => {
    const screen = await render(<Preview source="Just a paragraph." />);

    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents" }))
      .not.toBeInTheDocument();
  });
});
