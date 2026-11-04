import { useRef } from "react";
import { page, server, userEvent } from "vitest/browser";
import { render, type RenderResult } from "vitest-browser-react";

import "../../../../styles/system.css";

import TableOfContents from "./TableOfContents";
import { requireElement } from "../../test/dom";
import type { Heading } from "./types/heading";

const headings: readonly Heading[] = [
  { id: "introduction", text: "Introduction", level: 1 },
  { id: "details", text: "Details", level: 2 },
];

interface FixtureProps {
  headings?: readonly Heading[];
  onNavigate?: (id: string) => void;
}

function Fixture({ headings: fixtureItems = headings, onNavigate }: FixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section ref={scrollRootRef} aria-label="TOC scroller">
      <TableOfContents
        headings={fixtureItems}
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

  it("renders nothing when there are no headings", async () => {
    const screen = await render(<Fixture headings={[]} />);

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
      .closest<HTMLElement>(".table-of-contents-drawer");

    expect(panel?.style.getPropertyValue("--table-of-contents-visible-size")).toBe("40px");
    expect(panel?.style.getPropertyValue("--table-of-contents-visible-start")).toBe("44px");
  });
});

const longDocumentHeadings: readonly Heading[] = Array.from({ length: 40 }, (_, index) => ({
  id: `section-${index}`,
  text: `Section ${index}`,
  level: 1,
}));

interface LongDocumentFixtureProps {
  sectionHeight?: number;
  onNavigate?: (id: string) => void;
}

function LongDocumentFixture({ sectionHeight = 250, onNavigate }: LongDocumentFixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={scrollRootRef}
      aria-label="Long document"
      style={{
        height: 350,
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        alignItems: "start",
      }}
    >
      <TableOfContents
        headings={longDocumentHeadings}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        {...(onNavigate ? { onNavigate } : {})}
      />
      <article ref={contentRootRef}>
        {longDocumentHeadings.map((item) => (
          <section key={item.id} style={{ height: sectionHeight }}>
            <h2 id={item.id}>{item.text}</h2>
          </section>
        ))}
      </article>
    </section>
  );
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

function gesturePointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "lostpointercapture",
  x: number,
  y: number,
) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

type Point = readonly [x: number, y: number];

function dragFrom(element: Element, [start, ...moves]: readonly [Point, ...Point[]]) {
  element.dispatchEvent(gesturePointerEvent("pointerdown", ...start));

  for (const move of moves) {
    element.dispatchEvent(gesturePointerEvent("pointermove", ...move));
  }
}

async function settle(element: Element) {
  await new Promise(requestAnimationFrame);
  await Promise.all(element.getAnimations({ subtree: true }).map(({ finished }) => finished));
}

async function openPanel(screen: RenderResult) {
  await screen.getByRole("button", { name: "Open table of contents" }).click();
  const handle = screen.getByRole("button", { name: "Close table of contents" }).element();
  await settle(requireElement(handle.closest(".table-of-contents-drawer"), HTMLElement));

  return handle;
}

describe("TableOfContents drawer", () => {
  beforeEach(async () => {
    await page.viewport(390, 844);
    vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "hasPointerCapture").mockReturnValue(false);
  });

  it("opens with an accessible handle and closes after a regular navigation", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents", includeHidden: true }))
      .not.toBeVisible();

    await screen.getByRole("button", { name: "Open table of contents" }).click();

    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents" }))
      .toBeVisible();
    const drawer = requireElement(
      screen
        .getByRole("navigation", { name: "Table of contents" })
        .element()
        .closest(".table-of-contents-drawer"),
      HTMLElement,
    );

    expect(drawer.getBoundingClientRect().width).toBe(390);
    expect(drawer.getBoundingClientRect().height).toBeCloseTo(844, 1);
    await screen.getByRole("link", { name: "Details" }).click();

    expect(onNavigate).toHaveBeenCalledWith("details");
    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("continues a handle drag into heading scrubbing and navigates on release", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    const scroller = screen.getByRole("region", { name: "Long document" }).element();
    const target = screen.getByRole("heading", { name: "Section 2", exact: true }).element();
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
      [130, 452],
      [130, 484],
    ]);

    await expect
      .element(screen.getByRole("link", { name: "Section 2", exact: true }))
      .toHaveAttribute("data-active", "true");
    await vi.waitFor(() =>
      expect(target.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );

    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 484));

    expect(onNavigate).toHaveBeenCalledWith("section-2");
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("abandons a scrub without navigating when pointer capture is lost", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
      [130, 452],
    ]);
    await expect
      .element(screen.getByRole("link", { name: "Details" }))
      .toHaveAttribute("data-active", "true");

    handle.dispatchEvent(gesturePointerEvent("lostpointercapture", 130, 452));
    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 452));

    expect(onNavigate).not.toHaveBeenCalled();
    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("stays open when the opening gesture is released without vertical scrubbing", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 420));

    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape", async () => {
    const screen = await render(<Fixture />);
    const handle = await openPanel(screen);

    await userEvent.keyboard("{Escape}");

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the viewport widens to the desktop layout", async () => {
    const screen = await render(<Fixture />);
    const handle = await openPanel(screen);

    await page.viewport(1280, 800);

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when tapping anywhere other than a heading link", async () => {
    const screen = await render(<Fixture />);

    await screen.getByRole("button", { name: "Open table of contents" }).click();
    const list = screen
      .getByRole("navigation", { name: "Table of contents" })
      .getByRole("list")
      .element();

    list.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the table of contents open if the platform cancels after the threshold", async () => {
    const screen = await render(<Fixture />);

    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    dragFrom(handle, [
      [180, 400],
      [300, 400],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointercancel", 300, 400));

    await expect
      .element(screen.getByRole("button", { name: "Close table of contents" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("cancels native touch behaviour only on the handle", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const handleTouch = gestureTouchEvent("touchstart", 16, 400);
    const articleTouch = gestureTouchEvent("touchstart", 180, 400);

    handle.dispatchEvent(handleTouch);
    document.body.dispatchEvent(articleTouch);

    expect(handleTouch.defaultPrevented).toBe(true);
    expect(articleTouch.defaultPrevented).toBe(false);
    expect(getComputedStyle(handle).touchAction).toBe("none");
  });

  it("treats movement within the drag hysteresis distance as a tap and toggles once", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [16, 400],
      [18, 402],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 18, 402));
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));

    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores the click after a drag but still accepts keyboard activation", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [16, 400],
      [136, 400],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 136, 400));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    handle.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    await expect.element(handle).toHaveAttribute("aria-expanded", "true");

    handle.focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves heading-list scrolling to the browser", async () => {
    const screen = await render(<Fixture />);
    await openPanel(screen);
    const link = screen.getByRole("link", { name: "Details" }).element();
    const scroll = gestureTouchEvent("touchmove", 180, 300);

    link.dispatchEvent(gestureTouchEvent("touchstart", 180, 400));
    link.dispatchEvent(scroll);
    link.dispatchEvent(gestureTouchEvent("touchend", 180, 300));

    expect(scroll.defaultPrevented).toBe(false);
    expect(getComputedStyle(link).touchAction).toBe("auto");
    await expect
      .element(screen.getByRole("button", { name: "Close table of contents" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("closes on a leftward handle swipe without navigating or reopening on click", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    const closedLeft = screen
      .getByRole("button", { name: "Open table of contents" })
      .element()
      .getBoundingClientRect().left;
    const handle = await openPanel(screen);
    const openLeft = handle.getBoundingClientRect().left;

    dragFrom(handle, [
      [360, 400],
      [260, 400],
    ]);
    await vi.waitFor(() =>
      expect(handle.getBoundingClientRect().left).toBeCloseTo(openLeft - 100, 0),
    );

    handle.dispatchEvent(gesturePointerEvent("pointermove", 160, 400));
    handle.dispatchEvent(gesturePointerEvent("pointerup", 160, 400));
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(handle.getBoundingClientRect().left).toBeCloseTo(closedLeft, 0));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each(["pointerup", "pointercancel"] as const)(
    "restores the open position after a short closing drag on %s",
    async (endEvent) => {
      const screen = await render(<Fixture />);
      const handle = await openPanel(screen);
      const openLeft = handle.getBoundingClientRect().left;

      dragFrom(handle, [
        [360, 400],
        [330, 400],
      ]);
      handle.dispatchEvent(gesturePointerEvent(endEvent, 330, 400));

      await expect.element(handle).toHaveAttribute("aria-expanded", "true");
      await vi.waitFor(() => expect(handle.getBoundingClientRect().left).toBeCloseTo(openLeft, 0));
    },
  );
});
