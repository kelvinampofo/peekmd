import { useRef } from "react";
import { server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import TableOfContents, { type TableOfContentsItem } from "./TableOfContents";

const items: readonly TableOfContentsItem[] = [
  { id: "introduction", text: "Introduction", level: 1 },
  { id: "details", text: "Details", level: 2 },
];

interface FixtureProps {
  items?: readonly TableOfContentsItem[];
  onNavigate?: (id: string) => void;
}

function Fixture({ items: fixtureItems = items, onNavigate }: FixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section ref={scrollRootRef} aria-label="TOC scroller">
      <TableOfContents
        items={fixtureItems}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        {...(onNavigate ? { onNavigate } : {})}
      />
      <article ref={contentRootRef}>
        <h1 id="introduction">Introduction</h1>
        <p>Overview</p>
        <h2 id="details">Details</h2>
      </article>
    </section>
  );
}

function elementRect(top: number, height = 40): DOMRect {
  return {
    bottom: top + height,
    height,
    left: 0,
    right: 800,
    top,
    width: 800,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

async function tabToNextControl() {
  if (server.browser === "webkit" && server.platform === "darwin") {
    await userEvent.keyboard("{Alt>}{Tab}{/Alt}");
    return;
  }

  await userEvent.tab();
}

describe("TableOfContents", () => {
  it("renders native anchor links for each heading", async () => {
    const screen = await render(<Fixture />);

    const introduction = screen.getByRole("link", { name: "Introduction" });
    const details = screen.getByRole("link", { name: "Details" });

    await expect.element(introduction).toHaveAttribute("href", "#introduction");
    await expect.element(details).toHaveAttribute("href", "#details");
    await expect.element(screen.getByText("Contents")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no items", async () => {
    const screen = await render(<Fixture items={[]} />);

    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents" }))
      .not.toBeInTheDocument();
  });

  it("reports navigation through its optional callback", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);

    await screen.getByRole("link", { name: "Details" }).click();

    expect(onNavigate).toHaveBeenCalledWith("details");
  });

  it("moves keyboard focus through heading links in document order", async () => {
    const screen = await render(<Fixture />);

    await tabToNextControl();
    await expect.element(screen.getByRole("link", { name: "Introduction" })).toHaveFocus();

    await tabToNextControl();
    await expect.element(screen.getByRole("link", { name: "Details" })).toHaveFocus();
  });

  it("tracks the current and visible headings as its scroll root moves", async () => {
    let detailsTop = 300;
    const getBoundingClientRect = Element.prototype.getBoundingClientRect;

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        if (this.id === "introduction") return elementRect(-100);
        if (this.id === "details") return elementRect(detailsTop);
        if (this.classList.contains("table-of-contents__scroll-map")) {
          return elementRect(0, 84);
        }
        if (this.getAttribute("data-heading-id") === "introduction") return elementRect(0);
        if (this.getAttribute("data-heading-id") === "details") return elementRect(44);
        return getBoundingClientRect.call(this);
      },
    );

    const screen = await render(<Fixture />);
    const introduction = screen.getByRole("link", { name: "Introduction" });
    const details = screen.getByRole("link", { name: "Details" });

    await expect.element(introduction).toHaveAttribute("aria-current", "location");

    detailsTop = 20;
    const scrollRoot = screen.getByRole("region", { name: "TOC scroller" }).element();
    Object.defineProperties(scrollRoot, {
      clientHeight: { configurable: true, value: 250 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 500 },
    });
    scrollRoot.dispatchEvent(new Event("scroll"));
    await new Promise(requestAnimationFrame);

    await expect.element(details).toHaveAttribute("aria-current", "location");
    await expect.element(introduction).not.toHaveAttribute("data-active");
    await expect.element(details).toHaveAttribute("data-active", "true");

    const panel = screen
      .getByRole("navigation", { name: "Table of contents" })
      .element()
      .closest<HTMLElement>(".table-of-contents-panel");

    expect(panel?.style.getPropertyValue("--table-of-contents-visible-size")).toBe("40px");
    expect(panel?.style.getPropertyValue("--table-of-contents-visible-start")).toBe("44px");
  });
});
