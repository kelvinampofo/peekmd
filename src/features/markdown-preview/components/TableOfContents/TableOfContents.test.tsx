import { useRef } from "react";
import { page, server, userEvent } from "vitest/browser";
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

function gestureTouchEvent(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  x: number,
  y: number,
) {
  const event = new UIEvent(type, { bubbles: true, cancelable: true });
  const touch = { clientX: x, clientY: y };

  Object.defineProperty(event, "touches", {
    value: type === "touchend" || type === "touchcancel" ? [] : [touch],
  });
  Object.defineProperty(event, "changedTouches", { value: [touch] });

  return event;
}

function dragFrom(element: Element, points: ReadonlyArray<[number, number]>) {
  element.dispatchEvent(gestureTouchEvent("touchstart", points[0]?.[0] ?? 0, points[0]?.[1] ?? 0));

  for (const [clientX, clientY] of points.slice(1)) {
    element.dispatchEvent(gestureTouchEvent("touchmove", clientX, clientY));
  }
}

async function tabToNextControl() {
  if (server.browser === "webkit" && server.platform === "darwin") {
    await userEvent.keyboard("{Alt>}{Tab}{/Alt}");
    return;
  }

  await userEvent.tab();
}

describe("TableOfContents", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

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

    detailsTop = -20;
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

  describe("on a mobile viewport", () => {
    beforeEach(async () => {
      await page.viewport(390, 844);
    });

    it("opens with an accessible handle and closes after a regular navigation", async () => {
      const onNavigate = vi.fn();
      const screen = await render(<Fixture onNavigate={onNavigate} />);
      const navigation = document.querySelector<HTMLElement>(".table-of-contents");

      expect(navigation).not.toBeNull();
      expect(getComputedStyle(navigation!).visibility).toBe("hidden");

      await screen.getByRole("button", { name: "Open table of contents" }).click();

      await expect
        .element(screen.getByRole("navigation", { name: "Table of contents" }))
        .toBeVisible();
      const panel = screen
        .getByRole("navigation", { name: "Table of contents" })
        .element()
        .closest<HTMLElement>(".table-of-contents-panel");

      expect(panel?.getBoundingClientRect().width).toBe(390);
      expect(panel?.getBoundingClientRect().height).toBeCloseTo(844, 1);
      await screen.getByRole("link", { name: "Details" }).click();

      expect(onNavigate).toHaveBeenCalledWith("details");
      await expect
        .element(screen.getByRole("button", { name: "Open table of contents" }))
        .toHaveAttribute("aria-expanded", "false");
    });

    it("morphs its line into a chevron in proportion to the opening drag", async () => {
      const screen = await render(<Fixture />);
      const handle = screen
        .getByRole("button", { name: "Open table of contents" })
        .element() as HTMLButtonElement;

      dragFrom(handle, [
        [12, 400],
        [56, 400],
      ]);

      await vi.waitFor(() => {
        expect(handle.querySelector("path")?.getAttribute("d")).toBe("M 4 4 L 9 20 L 4 36");
        expect(
          handle
            .closest<HTMLElement>(".table-of-contents-panel")
            ?.style.getPropertyValue("--table-of-contents-open-progress"),
        ).toBe("0.5");
        expect(
          handle
            .closest<HTMLElement>(".table-of-contents-panel")
            ?.style.getPropertyValue("--table-of-contents-handle-offset"),
        ).toBe("8px");
        expect(
          handle
            .closest<HTMLElement>(".table-of-contents-panel")
            ?.style.getPropertyValue("--table-of-contents-reveal"),
        ).toBe("0%");
      });
    });

    it("opens from anywhere and continues into heading scrubbing without releasing", async () => {
      const onNavigate = vi.fn();
      const scrollIntoView = vi
        .spyOn(Element.prototype, "scrollIntoView")
        .mockImplementation(() => {});
      const screen = await render(<Fixture onNavigate={onNavigate} />);

      dragFrom(document.body, [
        [10, 400],
        [98, 420],
        [98, 452],
      ]);

      await expect
        .element(screen.getByRole("link", { name: "Details" }))
        .toHaveAttribute("data-active", "true");
      expect(scrollIntoView).toHaveBeenCalledOnce();

      document.body.dispatchEvent(gestureTouchEvent("touchend", 98, 452));

      expect(onNavigate).toHaveBeenCalledWith("details");
      await expect
        .element(screen.getByRole("button", { name: "Open table of contents" }))
        .toHaveAttribute("aria-expanded", "false");
    });

    it("stays open when the opening gesture is released without vertical scrubbing", async () => {
      const screen = await render(<Fixture />);
      const handle = screen
        .getByRole("button", { name: "Open table of contents" })
        .element() as HTMLButtonElement;

      dragFrom(handle, [
        [10, 400],
        [98, 420],
      ]);
      handle.dispatchEvent(gestureTouchEvent("touchend", 98, 420));

      await expect
        .element(screen.getByRole("button", { name: "Close table of contents" }))
        .toHaveAttribute("aria-expanded", "true");
      expect(handle.querySelector("path")?.getAttribute("d")).toBe("M 4 4 L 4 20 L 4 36");
      expect(
        handle
          .closest<HTMLElement>(".table-of-contents-panel")
          ?.style.getPropertyValue("--table-of-contents-handle-offset"),
      ).toBe("32px");
    });

    it("closes when tapping anywhere other than a heading link", async () => {
      const screen = await render(<Fixture />);

      await screen.getByRole("button", { name: "Open table of contents" }).click();
      const listWhitespace = document.querySelector<HTMLElement>(".table-of-contents__list");

      listWhitespace?.dispatchEvent(gestureTouchEvent("touchstart", 300, 700));
      listWhitespace?.dispatchEvent(gestureTouchEvent("touchend", 300, 700));

      await expect
        .element(screen.getByRole("button", { name: "Open table of contents" }))
        .toHaveAttribute("aria-expanded", "false");
    });

    it("keeps the table of contents open if the platform cancels after the threshold", async () => {
      const screen = await render(<Fixture />);

      dragFrom(document.body, [
        [180, 400],
        [268, 400],
      ]);
      document.body.dispatchEvent(gestureTouchEvent("touchcancel", 268, 400));

      await expect
        .element(screen.getByRole("button", { name: "Close table of contents" }))
        .toHaveAttribute("aria-expanded", "true");
    });

    it("preserves ordinary vertical document movement outside the handle", async () => {
      const screen = await render(<Fixture />);
      const scrollRoot = screen.getByRole("region", { name: "TOC scroller" }).element();

      Object.defineProperty(scrollRoot, "scrollTop", {
        configurable: true,
        value: 500,
        writable: true,
      });
      document.body.dispatchEvent(gestureTouchEvent("touchstart", 180, 400));
      const preservedNativeScroll = document.body.dispatchEvent(
        gestureTouchEvent("touchmove", 180, 300),
      );

      expect(preservedNativeScroll).toBe(true);
      expect(scrollRoot.scrollTop).toBe(500);
      document.body.dispatchEvent(gestureTouchEvent("touchend", 180, 300));
    });
  });
});
